\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'movprompt_api') THEN
    CREATE ROLE movprompt_api LOGIN PASSWORD 'movprompt-api-local-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'movprompt_worker') THEN
    CREATE ROLE movprompt_worker LOGIN PASSWORD 'movprompt-worker-local-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  END IF;
END
$roles$;

DO $database_access$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO movprompt_api, movprompt_worker',
    current_database()
  );
END
$database_access$;

DO $bootstrap$
BEGIN
  EXECUTE format(
    'COMMENT ON DATABASE %I IS %L',
    current_database(),
    'MovPrompt portable local development database. Application schema is installed by versioned migrations.'
  );
END
$bootstrap$;
