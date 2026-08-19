-- pg-boss owns its queue objects in a dedicated schema. The restricted worker
-- must not need broad CREATE permission on the application database.
CREATE SCHEMA IF NOT EXISTS pgboss;

REVOKE ALL ON SCHEMA pgboss FROM PUBLIC;

DO $roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'movprompt_worker') THEN
    GRANT USAGE, CREATE ON SCHEMA pgboss TO movprompt_worker;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
      ON ALL TABLES IN SCHEMA pgboss TO movprompt_worker;
    GRANT USAGE, SELECT, UPDATE
      ON ALL SEQUENCES IN SCHEMA pgboss TO movprompt_worker;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgboss TO movprompt_worker;
  END IF;
END
$roles$;
