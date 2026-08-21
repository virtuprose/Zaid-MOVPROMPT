-- Guest claim tables were introduced after the original portable-role grants.
-- Keep the API and cleanup worker least-privileged while making the real
-- restricted-role claim path executable on a freshly migrated database.
REVOKE ALL ON TABLE guest_claim_operations, guest_claim_assets FROM PUBLIC;

DO $roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'movprompt_api') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON TABLE guest_claim_operations, guest_claim_assets
      TO movprompt_api;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'movprompt_worker') THEN
    GRANT SELECT, UPDATE
      ON TABLE guest_claim_operations, guest_claim_assets
      TO movprompt_worker;
  END IF;
END
$roles$;
