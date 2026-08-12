-- Product invariants that are intentionally maintained as repository-owned SQL.

ALTER TABLE video_templates
  ADD CONSTRAINT video_templates_current_version_fk
  FOREIGN KEY (current_published_version_id, id)
  REFERENCES video_template_versions(id, template_id)
  ON DELETE SET NULL;

ALTER TABLE creator_projects
  ADD CONSTRAINT creator_projects_current_version_fk
  FOREIGN KEY (current_accepted_version_id, id, user_id)
  REFERENCES creator_project_versions(id, project_id, user_id)
  ON DELETE RESTRICT;

ALTER TABLE generation_quotes
  ADD CONSTRAINT generation_quotes_approved_capability
  CHECK (capability_alias IN (
    'video.seedance.latest',
    'video.omni_flash.latest',
    'image.nano_banana.latest'
  ));

ALTER TABLE render_runs
  ADD CONSTRAINT render_runs_approved_capability
  CHECK (capability_alias IN (
    'video.seedance.latest',
    'video.omni_flash.latest',
    'image.nano_banana.latest'
  ));

CREATE OR REPLACE FUNCTION movprompt_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER credit_ledger_append_only
BEFORE UPDATE OR DELETE ON credit_ledger
FOR EACH ROW EXECUTE FUNCTION movprompt_reject_mutation();

CREATE TRIGGER creator_project_versions_immutable
BEFORE UPDATE OR DELETE ON creator_project_versions
FOR EACH ROW EXECUTE FUNCTION movprompt_reject_mutation();

-- RLS is defense in depth. API transactions set movprompt.user_id after
-- authenticating the request. Workers use a distinct service role.
ALTER TABLE creator_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_project_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY creator_projects_owner_policy ON creator_projects
  USING (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid);

CREATE POLICY creator_versions_owner_policy ON creator_project_versions
  USING (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid);

CREATE POLICY creator_assets_owner_policy ON creator_project_assets
  USING (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid);

CREATE POLICY generation_quotes_owner_policy ON generation_quotes
  USING (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid);

CREATE POLICY render_runs_owner_policy ON render_runs
  USING (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid);

CREATE POLICY exports_owner_policy ON exports
  USING (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid);

CREATE POLICY credit_accounts_owner_policy ON credit_accounts
  USING (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid);

CREATE POLICY credit_ledger_owner_policy ON credit_ledger
  USING (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid);

CREATE POLICY notifications_owner_policy ON notifications
  USING (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid);
