DO $enum$
BEGIN
  CREATE TYPE service_heartbeat_status AS ENUM ('starting', 'ready', 'stopping');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$enum$;

CREATE TABLE IF NOT EXISTS service_heartbeats (
  service_name text NOT NULL,
  instance_id text NOT NULL,
  status service_heartbeat_status NOT NULL DEFAULT 'starting',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_name, instance_id)
);

CREATE INDEX IF NOT EXISTS service_heartbeats_freshness_idx
  ON service_heartbeats (service_name, status, last_seen_at);

ALTER TABLE render_attempts
  ADD COLUMN IF NOT EXISTS provider_cost_microusd bigint,
  ADD COLUMN IF NOT EXISTS provider_latency_ms integer,
  ADD COLUMN IF NOT EXISTS provider_usage jsonb;

DO $checks$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'render_attempts_provider_cost_nonnegative') THEN
    ALTER TABLE render_attempts
      ADD CONSTRAINT render_attempts_provider_cost_nonnegative
      CHECK (provider_cost_microusd IS NULL OR provider_cost_microusd >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'render_attempts_provider_latency_nonnegative') THEN
    ALTER TABLE render_attempts
      ADD CONSTRAINT render_attempts_provider_latency_nonnegative
      CHECK (provider_latency_ms IS NULL OR provider_latency_ms >= 0);
  END IF;
END
$checks$;

REVOKE ALL ON TABLE service_heartbeats FROM PUBLIC;

DO $roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'movprompt_api') THEN
    GRANT SELECT ON TABLE service_heartbeats, render_attempts TO movprompt_api;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'movprompt_worker') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE service_heartbeats, render_attempts TO movprompt_worker;
  END IF;
END
$roles$;
