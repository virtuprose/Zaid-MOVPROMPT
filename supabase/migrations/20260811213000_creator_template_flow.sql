-- Canonical template creator, project, render and export foundation.
-- Guest drafts and blobs intentionally remain client-side until authenticated claim.

CREATE TABLE public.video_templates (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  category text NOT NULL,
  publishing_state text NOT NULL DEFAULT 'draft' CHECK (publishing_state IN ('draft','published','archived')),
  current_published_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.video_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL REFERENCES public.video_templates(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  localized_name jsonb NOT NULL DEFAULT '{}'::jsonb,
  localized_description jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipe_json jsonb NOT NULL,
  input_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  edit_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  supported_languages text[] NOT NULL DEFAULT ARRAY['en']::text[],
  supported_ratios text[] NOT NULL DEFAULT ARRAY['9:16']::text[],
  supported_markets text[] NOT NULL DEFAULT ARRAY['KW','SA','AE','QA','BH','OM']::text[],
  duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 3 AND 30),
  preview_storage_path text,
  poster_storage_path text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version_number),
  UNIQUE (id, template_id)
);

ALTER TABLE public.video_templates
  ADD CONSTRAINT video_templates_current_version_fk
  FOREIGN KEY (current_published_version_id, id)
  REFERENCES public.video_template_versions(id, template_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.creator_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled campaign',
  mode text NOT NULL DEFAULT 'template' CHECK (mode IN ('template','advanced')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','generating','review','failed','exporting','completed','trashed')),
  current_accepted_version_id uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

CREATE TABLE public.creator_project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_version_id uuid,
  template_version_id uuid REFERENCES public.video_template_versions(id) ON DELETE RESTRICT,
  mode text NOT NULL CHECK (mode IN ('template','advanced')),
  version_number integer NOT NULL CHECK (version_number > 0),
  configuration jsonb NOT NULL,
  product_recipe jsonb NOT NULL DEFAULT '{}'::jsonb,
  campaign_recipe jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version_number),
  UNIQUE (id, project_id, user_id),
  FOREIGN KEY (project_id, user_id) REFERENCES public.creator_projects(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (parent_version_id, project_id, user_id) REFERENCES public.creator_project_versions(id, project_id, user_id) ON DELETE RESTRICT
);

ALTER TABLE public.creator_projects
  ADD CONSTRAINT creator_projects_current_version_fk
  FOREIGN KEY (current_accepted_version_id, id, user_id)
  REFERENCES public.creator_project_versions(id, project_id, user_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.creator_project_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  asset_kind text NOT NULL CHECK (asset_kind IN ('product','logo','audio','reference','generated','export')),
  storage_bucket text NOT NULL DEFAULT 'creator-assets' CHECK (storage_bucket IN ('creator-assets','creator-outputs')),
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  checksum_sha256 text,
  width integer,
  height integer,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (storage_bucket, storage_path),
  FOREIGN KEY (project_id, user_id) REFERENCES public.creator_projects(id, user_id) ON DELETE CASCADE
);

CREATE TABLE public.creator_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_type text NOT NULL CHECK (entitlement_type IN ('starter_template_render')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','consumed')),
  reserved_run_id uuid,
  reserved_operation_key text,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entitlement_type)
);

CREATE TABLE public.creator_generation_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  template_version_id uuid REFERENCES public.video_template_versions(id) ON DELETE RESTRICT,
  capability_alias text NOT NULL CHECK (capability_alias IN ('video.seedance.latest','video.omni_flash.latest')),
  credits integer NOT NULL CHECK (credits >= 0),
  entitlement_eligible boolean NOT NULL DEFAULT false,
  breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  configuration_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.creator_render_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  project_version_id uuid NOT NULL,
  user_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  capability_alias text NOT NULL CHECK (capability_alias IN ('video.seedance.latest','video.omni_flash.latest')),
  quote_id uuid NOT NULL REFERENCES public.creator_generation_quotes(id) ON DELETE RESTRICT,
  quoted_credits integer NOT NULL CHECK (quoted_credits >= 0),
  charged_credits integer NOT NULL DEFAULT 0 CHECK (charged_credits >= 0),
  starter_entitlement_used boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'submitting' CHECK (status IN ('submitting','queued','processing','completed','failed','cancelling','cancelled')),
  provider_request_id text,
  output_bucket text,
  output_path text,
  error_code text,
  error_message text,
  refund_status text NOT NULL DEFAULT 'not_required' CHECK (refund_status IN ('not_required','pending','refunded')),
  charged_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key),
  UNIQUE (id, project_id, project_version_id, user_id),
  FOREIGN KEY (project_id, user_id) REFERENCES public.creator_projects(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (project_version_id, project_id, user_id) REFERENCES public.creator_project_versions(id, project_id, user_id) ON DELETE RESTRICT
);

ALTER TABLE public.creator_entitlements
  ADD CONSTRAINT creator_entitlements_reserved_run_fk
  FOREIGN KEY (reserved_run_id) REFERENCES public.creator_render_runs(id) ON DELETE SET NULL;

CREATE TABLE public.creator_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  project_version_id uuid NOT NULL,
  render_run_id uuid NOT NULL,
  user_id uuid NOT NULL,
  aspect_ratio text NOT NULL CHECK (aspect_ratio IN ('9:16','1:1','4:5','16:9')),
  resolution text NOT NULL CHECK (resolution IN ('720p','1080p')),
  codec text NOT NULL DEFAULT 'h264',
  preset text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed','cancelled')),
  output_bucket text,
  output_path text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (project_version_id, aspect_ratio, resolution, preset),
  FOREIGN KEY (project_id, user_id) REFERENCES public.creator_projects(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (project_version_id, project_id, user_id) REFERENCES public.creator_project_versions(id, project_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (render_run_id, project_id, project_version_id, user_id) REFERENCES public.creator_render_runs(id, project_id, project_version_id, user_id) ON DELETE RESTRICT
);

ALTER TABLE public.video_jobs ADD COLUMN render_run_id uuid REFERENCES public.creator_render_runs(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX video_jobs_render_run_unique_idx ON public.video_jobs(render_run_id) WHERE render_run_id IS NOT NULL;

ALTER TABLE public.credit_ledger ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX credit_ledger_idempotency_unique_idx ON public.credit_ledger(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.charge_credits_idempotent(
  _user_id uuid, _amount integer, _reason text, _ref_id text, _metadata jsonb, _idempotency_key text
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_balance integer; new_balance integer; existing_balance integer;
BEGIN
  IF _amount <= 0 OR length(coalesce(_idempotency_key,'')) < 8 THEN RAISE EXCEPTION 'invalid_credit_operation'; END IF;
  SELECT balance_after INTO existing_balance FROM public.credit_ledger WHERE idempotency_key = _idempotency_key;
  IF FOUND THEN RETURN existing_balance; END IF;
  INSERT INTO public.user_credits(user_id,balance) VALUES (_user_id,0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO current_balance FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;
  SELECT balance_after INTO existing_balance FROM public.credit_ledger WHERE idempotency_key = _idempotency_key;
  IF FOUND THEN RETURN existing_balance; END IF;
  IF current_balance < _amount THEN RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001'; END IF;
  new_balance := current_balance - _amount;
  UPDATE public.user_credits SET balance = new_balance, lifetime_spent = lifetime_spent + _amount, updated_at = now() WHERE user_id = _user_id;
  INSERT INTO public.credit_ledger(user_id,delta,balance_after,reason,ref_id,metadata,idempotency_key) VALUES (_user_id,-_amount,new_balance,_reason,_ref_id,_metadata,_idempotency_key);
  RETURN new_balance;
END; $$;

CREATE OR REPLACE FUNCTION public.refund_credits_idempotent(
  _user_id uuid, _amount integer, _reason text, _ref_id text, _metadata jsonb, _idempotency_key text
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_balance integer; new_balance integer; existing_balance integer;
BEGIN
  IF _amount <= 0 OR length(coalesce(_idempotency_key,'')) < 8 THEN RAISE EXCEPTION 'invalid_credit_operation'; END IF;
  SELECT balance_after INTO existing_balance FROM public.credit_ledger WHERE idempotency_key = _idempotency_key;
  IF FOUND THEN RETURN existing_balance; END IF;
  INSERT INTO public.user_credits(user_id,balance) VALUES (_user_id,0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO current_balance FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;
  SELECT balance_after INTO existing_balance FROM public.credit_ledger WHERE idempotency_key = _idempotency_key;
  IF FOUND THEN RETURN existing_balance; END IF;
  new_balance := current_balance + _amount;
  UPDATE public.user_credits SET balance = new_balance, lifetime_spent = greatest(0,lifetime_spent - _amount), updated_at = now() WHERE user_id = _user_id;
  INSERT INTO public.credit_ledger(user_id,delta,balance_after,reason,ref_id,metadata,idempotency_key) VALUES (_user_id,_amount,new_balance,_reason,_ref_id,_metadata,_idempotency_key);
  RETURN new_balance;
END; $$;

REVOKE EXECUTE ON FUNCTION public.charge_credits_idempotent(uuid,integer,text,text,jsonb,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_credits_idempotent(uuid,integer,text,text,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.charge_credits_idempotent(uuid,integer,text,text,jsonb,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits_idempotent(uuid,integer,text,text,jsonb,text) TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('creator-assets','creator-assets',false,52428800), ('creator-outputs','creator-outputs',false,1073741824)
ON CONFLICT (id) DO UPDATE SET public = false;

ALTER TABLE public.video_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_project_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_generation_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_render_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published templates" ON public.video_templates FOR SELECT USING (publishing_state = 'published');
CREATE POLICY "Public reads published template versions" ON public.video_template_versions FOR SELECT USING (published_at IS NOT NULL AND EXISTS (SELECT 1 FROM public.video_templates t WHERE t.id = template_id AND t.publishing_state = 'published'));
CREATE POLICY "Users manage owned projects" ON public.creator_projects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage owned project versions" ON public.creator_project_versions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.creator_projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Users manage owned assets" ON public.creator_project_assets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.creator_projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Users read own entitlements" ON public.creator_entitlements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users read own quotes" ON public.creator_generation_quotes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users read own render runs" ON public.creator_render_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users read own exports" ON public.creator_exports FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users read own creator assets" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'creator-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users upload own creator assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'creator-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own creator assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'creator-assets' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'creator-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own creator assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'creator-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own creator outputs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'creator-outputs' AND (storage.foldername(name))[1] = auth.uid()::text);

GRANT SELECT ON public.video_templates, public.video_template_versions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_projects, public.creator_project_versions, public.creator_project_assets TO authenticated;
GRANT SELECT ON public.creator_entitlements, public.creator_generation_quotes, public.creator_render_runs, public.creator_exports TO authenticated;
GRANT ALL ON public.video_templates, public.video_template_versions, public.creator_projects, public.creator_project_versions, public.creator_project_assets, public.creator_entitlements, public.creator_generation_quotes, public.creator_render_runs, public.creator_exports TO service_role;

CREATE INDEX creator_projects_user_updated_idx ON public.creator_projects(user_id, updated_at DESC);
CREATE INDEX creator_versions_project_created_idx ON public.creator_project_versions(project_id, created_at DESC);
CREATE INDEX creator_assets_project_idx ON public.creator_project_assets(project_id, created_at DESC);
CREATE INDEX creator_runs_project_created_idx ON public.creator_render_runs(project_id, created_at DESC);
CREATE INDEX creator_runs_reconcile_idx ON public.creator_render_runs(status, updated_at) WHERE status IN ('submitting','queued','processing','cancelling');
CREATE INDEX creator_exports_project_created_idx ON public.creator_exports(project_id, created_at DESC);
CREATE UNIQUE INDEX video_jobs_pending_generation_unique_idx ON public.video_jobs(user_id, ((metadata->>'pending_generation_id'))) WHERE metadata ? 'pending_generation_id';

CREATE TRIGGER creator_projects_updated_at BEFORE UPDATE ON public.creator_projects FOR EACH ROW EXECUTE FUNCTION public.update_agent_profiles_updated_at();
CREATE TRIGGER creator_render_runs_updated_at BEFORE UPDATE ON public.creator_render_runs FOR EACH ROW EXECUTE FUNCTION public.update_agent_profiles_updated_at();
CREATE TRIGGER video_templates_updated_at BEFORE UPDATE ON public.video_templates FOR EACH ROW EXECUTE FUNCTION public.update_agent_profiles_updated_at();

WITH template_rows(id, slug, category, name_en, name_ar, description_en, description_ar, duration_seconds, preview_path, poster_path, recipe, input_schema, edit_schema) AS (
  VALUES
    ('luxury-product-reveal','luxury-product-reveal','product','Luxury product reveal','إطلاق منتج فاخر','A refined high-contrast product reveal.','إطلاق بصري راقٍ يبرز المنتج.',8,'presets/hero-shot.mp4','homepage/template-product-reveal.png','{"scene_count":4,"capability":"video.seedance.latest"}'::jsonb,'{"product_images":{"min":1,"max":5}}'::jsonb,'{"copy":true,"logo":true,"subtitles":true,"scene_order":true,"export":true}'::jsonb),
    ('hands-on-demo','hands-on-demo','demo','Hands-on product demo','عرض عملي للمنتج','A natural tactile product demonstration.','عرض عملي طبيعي يوضح المنتج.',12,'presets/ugc.mp4','homepage/template-creator-proof.png','{"scene_count":5,"capability":"video.seedance.latest"}'::jsonb,'{"product_images":{"min":1,"max":5}}'::jsonb,'{"copy":true,"logo":true,"subtitles":true,"scene_order":true,"export":true}'::jsonb),
    ('gcc-offer-launch','gcc-offer-launch','offer','GCC offer launch','إطلاق عرض خليجي','An Arabic-first retail offer format.','قالب عرض تجاري عربي أولاً.',10,'presets/speed-reveal.mp4','homepage/template-launch-story.png','{"scene_count":5,"capability":"video.seedance.latest"}'::jsonb,'{"product_images":{"min":1,"max":5},"market":true}'::jsonb,'{"copy":true,"logo":true,"subtitles":true,"scene_order":true,"export":true,"currency":true}'::jsonb)
), inserted_templates AS (
  INSERT INTO public.video_templates(id, slug, category, publishing_state)
  SELECT id, slug, category, 'published' FROM template_rows
  RETURNING id
), inserted_versions AS (
  INSERT INTO public.video_template_versions(template_id, version_number, localized_name, localized_description, recipe_json, input_schema, edit_schema, supported_languages, supported_ratios, supported_markets, duration_seconds, preview_storage_path, poster_storage_path, published_at)
  SELECT id, 1, jsonb_build_object('en',name_en,'ar',name_ar), jsonb_build_object('en',description_en,'ar',description_ar), recipe, input_schema, edit_schema, ARRAY['en','ar','bilingual'], ARRAY['9:16','1:1','4:5','16:9'], ARRAY['KW','SA','AE','QA','BH','OM'], duration_seconds, preview_path, poster_path, now() FROM template_rows
  RETURNING id, template_id
)
UPDATE public.video_templates t SET current_published_version_id = v.id FROM inserted_versions v WHERE t.id = v.template_id;

CREATE OR REPLACE FUNCTION public.grant_creator_starter_entitlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.creator_entitlements(user_id, entitlement_type) VALUES (NEW.id, 'starter_template_render') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER grant_creator_starter_entitlement_after_signup
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_creator_starter_entitlement();

INSERT INTO public.creator_entitlements(user_id, entitlement_type)
SELECT id, 'starter_template_render' FROM auth.users ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_starter_render(_user_id uuid, _operation_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE entitlement public.creator_entitlements%ROWTYPE;
BEGIN
  SELECT * INTO entitlement FROM public.creator_entitlements WHERE user_id = _user_id AND entitlement_type = 'starter_template_render' FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF entitlement.status = 'available' OR (entitlement.status = 'reserved' AND entitlement.reserved_operation_key = _operation_key) THEN
    UPDATE public.creator_entitlements SET status = 'reserved', reserved_operation_key = _operation_key WHERE id = entitlement.id;
    RETURN true;
  END IF;
  RETURN false;
END; $$;

CREATE OR REPLACE FUNCTION public.consume_starter_render(_user_id uuid, _operation_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.creator_entitlements SET status = 'consumed', consumed_at = now() WHERE user_id = _user_id AND entitlement_type = 'starter_template_render' AND reserved_operation_key = _operation_key AND status = 'reserved';
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.restore_starter_render(_user_id uuid, _operation_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.creator_entitlements SET status = 'available', reserved_operation_key = NULL, reserved_run_id = NULL, consumed_at = NULL WHERE user_id = _user_id AND entitlement_type = 'starter_template_render' AND reserved_operation_key = _operation_key AND status IN ('reserved','consumed');
  RETURN FOUND;
END; $$;

REVOKE EXECUTE ON FUNCTION public.claim_starter_render(uuid,text), public.consume_starter_render(uuid,text), public.restore_starter_render(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_starter_render(uuid,text), public.consume_starter_render(uuid,text), public.restore_starter_render(uuid,text) TO service_role;
