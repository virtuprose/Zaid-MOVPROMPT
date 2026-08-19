ALTER TABLE render_runs
  ADD COLUMN quality_attempt integer NOT NULL DEFAULT 0,
  ADD COLUMN max_quality_retries integer NOT NULL DEFAULT 2,
  ADD COLUMN quality_retry_directive text,
  ADD COLUMN last_quality_report jsonb,
  ADD CONSTRAINT render_runs_quality_attempt_valid CHECK (quality_attempt >= 0 AND quality_attempt <= 3),
  ADD CONSTRAINT render_runs_max_quality_retries_valid CHECK (max_quality_retries >= 0 AND max_quality_retries <= 3);

CREATE TABLE render_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  render_run_id uuid NOT NULL,
  project_id uuid NOT NULL,
  project_version_id uuid NOT NULL,
  user_id uuid NOT NULL,
  attempt_number integer NOT NULL,
  provider text NOT NULL,
  provider_request_id text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  candidate_bucket text,
  candidate_object_key text,
  quality_score integer,
  quality_decision jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT render_attempts_run_number_unique UNIQUE (render_run_id, user_id, attempt_number),
  CONSTRAINT render_attempts_provider_request_unique UNIQUE (provider, provider_request_id),
  CONSTRAINT render_attempts_run_owner_fk
    FOREIGN KEY (render_run_id, project_id, project_version_id, user_id)
    REFERENCES render_runs(id, project_id, project_version_id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT render_attempts_number_valid CHECK (attempt_number >= 0 AND attempt_number <= 3),
  CONSTRAINT render_attempts_quality_score_valid CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
  CONSTRAINT render_attempts_status_valid CHECK (status IN ('submitted', 'processing', 'quality_rejected', 'accepted', 'failed', 'cancelled'))
);

CREATE INDEX render_attempts_run_created_idx ON render_attempts(render_run_id, created_at);

ALTER TABLE render_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY render_attempts_owner_policy ON render_attempts
  USING (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('movprompt.user_id', true), '')::uuid);
