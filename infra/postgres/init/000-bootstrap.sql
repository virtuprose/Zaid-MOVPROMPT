\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $bootstrap$
BEGIN
  EXECUTE format(
    'COMMENT ON DATABASE %I IS %L',
    current_database(),
    'MovPrompt portable local development database. Application schema is installed by versioned migrations.'
  );
END
$bootstrap$;
