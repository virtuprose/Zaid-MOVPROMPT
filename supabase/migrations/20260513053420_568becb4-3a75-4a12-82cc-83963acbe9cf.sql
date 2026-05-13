-- Codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own code"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow lookup by code for attribution (only the code column is exposed via the RPC; this policy
-- enables anon attribution if ever needed but the app-side flow uses a SECURITY DEFINER RPC).
CREATE POLICY "Anyone can resolve a code"
  ON public.referral_codes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Referrals (one row per attributed signup)
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_id, created_at DESC);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read referrals they sent"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can read their own attribution"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referred_user_id);

-- Generate a short, URL-safe code (8 chars, lowercase + digits, no ambiguous chars)
CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet text := 'abcdefghjkmnpqrstuvwxyz23456789';
  out text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN out;
END;
$$;

-- Get-or-create the caller's referral code
CREATE OR REPLACE FUNCTION public.get_or_create_my_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing text;
  candidate text;
  attempt int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT code INTO existing FROM public.referral_codes WHERE user_id = uid;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  LOOP
    attempt := attempt + 1;
    candidate := public.gen_referral_code();
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (uid, candidate);
      RETURN candidate;
    EXCEPTION WHEN unique_violation THEN
      IF attempt > 6 THEN
        RAISE;
      END IF;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_my_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_my_referral_code() TO authenticated;

-- Attribute the calling user's signup to the owner of the supplied code.
-- Idempotent and self-referral safe.
CREATE OR REPLACE FUNCTION public.attribute_referral(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  ref_uid uuid;
BEGIN
  IF uid IS NULL OR _code IS NULL OR length(_code) = 0 THEN
    RETURN false;
  END IF;

  SELECT user_id INTO ref_uid FROM public.referral_codes WHERE code = _code;
  IF ref_uid IS NULL OR ref_uid = uid THEN
    RETURN false;
  END IF;

  -- Already attributed?
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = uid) THEN
    RETURN false;
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_user_id, code)
  VALUES (ref_uid, uid, _code);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.attribute_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attribute_referral(text) TO authenticated;