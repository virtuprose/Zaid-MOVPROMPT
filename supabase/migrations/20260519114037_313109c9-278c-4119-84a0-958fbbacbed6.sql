
-- ============ credit_prices ============
CREATE TABLE public.credit_prices (
  key text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('flat','per_second')),
  amount numeric NOT NULL CHECK (amount >= 0),
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read credit prices"
  ON public.credit_prices FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "Admins manage credit prices"
  ON public.credit_prices FOR ALL
  TO authenticated USING (public.has_role('admin'::app_role))
  WITH CHECK (public.has_role('admin'::app_role));

INSERT INTO public.credit_prices (key, kind, amount, description) VALUES
  ('director_chat_text','flat',1,'Director assistant reply (text)'),
  ('director_chat_multimodal','flat',3,'Director assistant reply with attachments'),
  ('image_generation','flat',5,'Reference image / ad still generation'),
  ('write_ad_scene','flat',2,'Ad scene text generation'),
  -- video per-second rates
  ('video.veo-3.1','per_second',45,NULL),
  ('video.veo-3.1-fast','per_second',20,NULL),
  ('video.veo-3.1-lite','per_second',10,NULL),
  ('video.veo-3','per_second',40,NULL),
  ('video.veo-3-fast','per_second',18,NULL),
  ('video.veo-2','per_second',12,NULL),
  ('video.kling-v3-pro','per_second',30,NULL),
  ('video.kling-v3-standard','per_second',12,NULL),
  ('video.kling-v3-4k','per_second',60,NULL),
  ('video.kling-omni','per_second',50,NULL),
  ('video.kling-omni-ref','per_second',50,NULL),
  ('video.kling-omni-edit','per_second',50,NULL),
  ('video.kling-motion-control','per_second',15,NULL),
  ('video.kling-v2.5-turbo-pro','per_second',25,NULL),
  ('video.kling-v2.1-master','per_second',35,NULL),
  ('video.kling-v2-master','per_second',35,NULL),
  ('video.kling-v1.6-pro','per_second',18,NULL),
  ('video.kling-v1.6-standard','per_second',8,NULL),
  ('video.kling-v1.5-pro','per_second',16,NULL),
  ('video.kling-v1-pro','per_second',14,NULL),
  ('video.kling-v1-standard','per_second',7,NULL),
  ('video.seedance-v1-pro','per_second',15,NULL),
  ('video.seedance-v1-pro-ref','per_second',15,NULL),
  ('video.seedance-v1-lite','per_second',6,NULL),
  ('video.hailuo-02-pro','per_second',18,NULL),
  ('video.hailuo-02-standard','per_second',8,NULL),
  ('video.hailuo-01','per_second',8,NULL),
  ('video.runway-gen3-turbo','per_second',20,NULL),
  ('video.wan-pro','per_second',22,NULL),
  ('video.wan-v2.2-a14b','per_second',18,NULL),
  ('video.ltx-video-13b','per_second',5,NULL),
  ('video.ltx-video','per_second',5,NULL),
  ('video.seedance','per_second',15,NULL),
  ('video.veo','per_second',18,NULL),
  ('video.kling','per_second',35,NULL);

-- ============ user_credits ============
CREATE TABLE public.user_credits (
  user_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_granted integer NOT NULL DEFAULT 0,
  lifetime_spent integer NOT NULL DEFAULT 0,
  last_daily_grant_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own wallet"
  ON public.user_credits FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all wallets"
  ON public.user_credits FOR SELECT
  TO authenticated USING (public.has_role('admin'::app_role));

-- ============ credit_ledger ============
CREATE TABLE public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL,
  ref_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_ledger_user_created ON public.credit_ledger (user_id, created_at DESC);
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ledger"
  ON public.credit_ledger FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all ledger"
  ON public.credit_ledger FOR SELECT
  TO authenticated USING (public.has_role('admin'::app_role));

-- ============ credit_topups (stub) ============
CREATE TABLE public.credit_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  cents integer,
  provider text,
  provider_ref text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own topups"
  ON public.credit_topups FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.charge_credits(
  _user_id uuid,
  _amount integer,
  _reason text,
  _ref_id text DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
  new_balance integer;
BEGIN
  IF _amount < 0 THEN
    RAISE EXCEPTION 'amount must be non-negative';
  END IF;
  IF _amount = 0 THEN
    SELECT balance INTO current_balance FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;
    RETURN COALESCE(current_balance, 0);
  END IF;

  -- ensure wallet exists
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO current_balance FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;
  IF current_balance < _amount THEN
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001';
  END IF;

  new_balance := current_balance - _amount;
  UPDATE public.user_credits
    SET balance = new_balance,
        lifetime_spent = lifetime_spent + _amount,
        updated_at = now()
    WHERE user_id = _user_id;

  INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason, ref_id, metadata)
  VALUES (_user_id, -_amount, new_balance, _reason, _ref_id, _metadata);

  RETURN new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_credits(
  _user_id uuid,
  _amount integer,
  _reason text,
  _ref_id text DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
  new_balance integer;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  INSERT INTO public.user_credits (user_id, balance) VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO current_balance FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;
  new_balance := current_balance + _amount;
  UPDATE public.user_credits
    SET balance = new_balance,
        lifetime_spent = GREATEST(0, lifetime_spent - _amount),
        updated_at = now()
    WHERE user_id = _user_id;

  INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason, ref_id, metadata)
  VALUES (_user_id, _amount, new_balance, _reason, _ref_id, _metadata);

  RETURN new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_credits(
  _user_id uuid,
  _amount integer,
  _reason text,
  _metadata jsonb DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  IF _amount <= 0 THEN RETURN 0; END IF;

  INSERT INTO public.user_credits (user_id, balance, lifetime_granted)
  VALUES (_user_id, _amount, _amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_credits.balance + EXCLUDED.balance,
        lifetime_granted = public.user_credits.lifetime_granted + EXCLUDED.lifetime_granted,
        updated_at = now()
  RETURNING balance INTO new_balance;

  INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason, metadata)
  VALUES (_user_id, _amount, new_balance, _reason, _metadata);

  RETURN new_balance;
END;
$$;

-- Daily free refill: +10 cr/day, cap at 30, granted lazily
CREATE OR REPLACE FUNCTION public.grant_daily_credits_if_due(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.user_credits%ROWTYPE;
  to_grant integer;
  cap constant integer := 30;
  daily constant integer := 10;
BEGIN
  INSERT INTO public.user_credits (user_id, balance) VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO w FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;

  IF w.last_daily_grant_at IS NOT NULL AND w.last_daily_grant_at > now() - interval '24 hours' THEN
    RETURN w.balance;
  END IF;
  IF w.balance >= cap THEN
    UPDATE public.user_credits SET last_daily_grant_at = now() WHERE user_id = _user_id;
    RETURN w.balance;
  END IF;

  to_grant := LEAST(daily, cap - w.balance);
  UPDATE public.user_credits
    SET balance = balance + to_grant,
        lifetime_granted = lifetime_granted + to_grant,
        last_daily_grant_at = now(),
        updated_at = now()
    WHERE user_id = _user_id;

  INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason)
  VALUES (_user_id, to_grant, w.balance + to_grant, 'daily_grant');

  RETURN w.balance + to_grant;
END;
$$;

-- Extend new-user trigger to seed wallet + signup bonus
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.user_credits (user_id, balance, lifetime_granted)
  VALUES (NEW.id, 50, 50)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason)
  VALUES (NEW.id, 50, 50, 'signup_bonus');

  RETURN NEW;
END;
$$;

-- Backfill wallets for existing users (50 credit welcome)
INSERT INTO public.user_credits (user_id, balance, lifetime_granted)
SELECT id, 50, 50 FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason)
SELECT user_id, 50, 50, 'backfill_bonus' FROM public.user_credits
WHERE NOT EXISTS (
  SELECT 1 FROM public.credit_ledger l WHERE l.user_id = public.user_credits.user_id
);
