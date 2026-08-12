DROP INDEX IF EXISTS creator_projects_user_draft_unique;

-- A browser draft can be claimed by exactly one account. This prevents a user
-- who later signs into the same browser from claiming another account's draft.
CREATE UNIQUE INDEX creator_projects_client_draft_unique
  ON creator_projects (client_draft_id)
  WHERE client_draft_id IS NOT NULL;

-- Starter entitlements are account-owned and participate in the same runtime
-- RLS boundary as credits, projects and runs.
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY entitlements_owner_policy ON entitlements
  USING (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid);

-- Repeat the final grants here so databases that applied the earlier creator
-- migration before runtime-role hardening receive the exact same privileges.
DO $roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'movprompt_api') THEN
    GRANT USAGE ON SCHEMA public TO movprompt_api;
    GRANT SELECT, INSERT, UPDATE, DELETE ON users, sessions, accounts, verifications TO movprompt_api;
    GRANT SELECT ON video_templates, video_template_versions TO movprompt_api;
    GRANT SELECT, INSERT, UPDATE ON
      creator_projects,
      creator_project_versions,
      creator_project_assets,
      generation_quotes,
      render_runs,
      entitlements,
      credit_accounts,
      credit_reservations,
      credit_ledger,
      exports,
      notifications,
      outbox_jobs
    TO movprompt_api;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'movprompt_worker') THEN
    GRANT USAGE ON SCHEMA public TO movprompt_worker;
    GRANT SELECT, INSERT, UPDATE, DELETE ON users TO movprompt_worker;
    GRANT SELECT, INSERT, UPDATE ON
      creator_projects,
      creator_project_versions,
      creator_project_assets,
      generation_quotes,
      render_runs,
      entitlements,
      credit_accounts,
      credit_reservations,
      credit_ledger,
      exports,
      notifications,
      outbox_jobs
    TO movprompt_worker;
  END IF;
END
$roles$;
