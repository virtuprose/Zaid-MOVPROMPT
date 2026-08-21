\set ON_ERROR_STOP on

BEGIN;

CREATE ROLE movprompt_rls_probe NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO movprompt_rls_probe;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  creator_projects, creator_project_versions, creator_project_assets,
  guest_claim_operations, guest_claim_assets,
  generation_quotes, render_runs, render_attempts, exports,
  credit_accounts, credit_ledger, credit_reservations, notifications
TO movprompt_rls_probe;

INSERT INTO users (id, name, email)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'RLS Owner A', 'rls-owner-a@movprompt.test'),
  ('20000000-0000-4000-8000-000000000002', 'RLS Owner B', 'rls-owner-b@movprompt.test');

INSERT INTO creator_projects (id, user_id, title)
VALUES
  ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Owner A project'),
  ('22000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Owner B project');
INSERT INTO creator_project_versions (id, project_id, user_id, mode, version_number, configuration)
VALUES
  ('11100000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'advanced', 1, '{"owner":"a"}'::jsonb),
  ('22200000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'advanced', 1, '{"owner":"b"}'::jsonb);
INSERT INTO creator_project_assets (id, project_id, user_id, asset_kind, storage_bucket, object_key, mime_type, size_bytes)
VALUES
  ('11110000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'product', 'creator-assets', 'users/a/projects/a/assets/a', 'image/png', 10),
  ('22220000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'product', 'creator-assets', 'users/b/projects/b/assets/b', 'image/png', 10);

INSERT INTO guest_claim_operations (id, user_id, draft_id, pending_generation_id, snapshot_digest, snapshot_json, project_id, status)
VALUES
  ('11120000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11130000-0000-4000-8000-000000000001', 'rls-owner-a-claim', repeat('a', 64), '{}'::jsonb, '11000000-0000-4000-8000-000000000001', 'failed'),
  ('22220000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '22230000-0000-4000-8000-000000000002', 'rls-owner-b-claim', repeat('b', 64), '{}'::jsonb, '22000000-0000-4000-8000-000000000002', 'failed');
INSERT INTO guest_claim_assets (id, claim_operation_id, user_id, local_asset_id, ordinal, asset_kind, status, mime_type, size_bytes, checksum_sha256)
VALUES
  ('11140000-0000-4000-8000-000000000001', '11120000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11150000-0000-4000-8000-000000000001', 0, 'product', 'failed', 'image/png', 10, repeat('a', 64)),
  ('22240000-0000-4000-8000-000000000002', '22220000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '22250000-0000-4000-8000-000000000002', 0, 'product', 'failed', 'image/png', 10, repeat('b', 64));

INSERT INTO generation_quotes (id, user_id, capability_alias, credits, breakdown, configuration_hash, expires_at)
VALUES
  ('11111000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'video.cinematic', 10, '[{"label":"test","credits":10}]'::jsonb, repeat('a', 64), now() + interval '5 minutes'),
  ('22222000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'video.cinematic', 10, '[{"label":"test","credits":10}]'::jsonb, repeat('b', 64), now() + interval '5 minutes');
INSERT INTO render_runs (id, project_id, project_version_id, user_id, idempotency_key, capability_alias, quote_id, quoted_credits)
VALUES
  ('11111100-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '11100000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'rls-owner-a-render', 'video.cinematic', '11111000-0000-4000-8000-000000000001', 10),
  ('22222200-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', '22200000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'rls-owner-b-render', 'video.cinematic', '22222000-0000-4000-8000-000000000002', 10);
INSERT INTO render_attempts (id, render_run_id, project_id, project_version_id, user_id, attempt_number, provider, provider_request_id)
VALUES
  ('11111101-0000-4000-8000-000000000001', '11111100-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '11100000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 0, 'rls-probe', 'rls-owner-a-attempt'),
  ('22222201-0000-4000-8000-000000000002', '22222200-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', '22200000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 0, 'rls-probe', 'rls-owner-b-attempt');
INSERT INTO credit_accounts (user_id, balance)
VALUES ('10000000-0000-4000-8000-000000000001', 10), ('20000000-0000-4000-8000-000000000002', 10);
INSERT INTO credit_ledger (id, user_id, kind, delta, balance_after, reason, idempotency_key)
VALUES
  ('11111110-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'grant', 10, 10, 'rls_probe', 'rls-owner-a-ledger'),
  ('22222220-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'grant', 10, 10, 'rls_probe', 'rls-owner-b-ledger');
INSERT INTO credit_reservations (id, user_id, render_run_id, amount, idempotency_key)
VALUES
  ('11111111-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11111100-0000-4000-8000-000000000001', 5, 'rls-owner-a-reservation'),
  ('22222222-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '22222200-0000-4000-8000-000000000002', 5, 'rls-owner-b-reservation');
INSERT INTO exports (id, project_id, project_version_id, render_run_id, user_id, idempotency_key, aspect_ratio, resolution, preset)
VALUES
  ('11111112-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '11100000-0000-4000-8000-000000000001', '11111100-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'rls-owner-a-export', '9:16', '1080p', 'social'),
  ('22222223-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', '22200000-0000-4000-8000-000000000002', '22222200-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'rls-owner-b-export', '9:16', '1080p', 'social');
INSERT INTO notifications (id, user_id, type, title, body)
VALUES
  ('11111113-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'rls_probe', 'Owner A', 'Private A notification'),
  ('22222224-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'rls_probe', 'Owner B', 'Private B notification');

SET LOCAL ROLE movprompt_rls_probe;
SET LOCAL movprompt.user_id = '10000000-0000-4000-8000-000000000001';

DO $$
DECLARE visible_count integer; affected_count integer; table_name text;
BEGIN
  IF current_user <> 'movprompt_rls_probe' THEN RAISE EXCEPTION 'RLS probe did not use restricted current_user'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolsuper OR rolbypassrls)) THEN RAISE EXCEPTION 'RLS probe role has superuser or bypassrls'; END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname IN ('creator_projects','creator_project_versions','creator_project_assets','guest_claim_operations','guest_claim_assets','generation_quotes','render_runs','render_attempts','exports','credit_accounts','credit_ledger','credit_reservations','notifications') AND NOT (relrowsecurity AND relforcerowsecurity)) THEN RAISE EXCEPTION 'Phase 2 owner table does not force RLS'; END IF;
  FOREACH table_name IN ARRAY ARRAY['creator_projects','creator_project_versions','creator_project_assets','guest_claim_operations','guest_claim_assets','generation_quotes','render_runs','render_attempts','exports','credit_accounts','credit_ledger','credit_reservations','notifications'] LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE user_id IN (%L::uuid, %L::uuid)', table_name, '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002') INTO visible_count;
    IF visible_count <> 1 THEN RAISE EXCEPTION 'RLS read isolation failed for %, got %', table_name, visible_count; END IF;
    EXECUTE format('UPDATE %I SET user_id = user_id WHERE user_id = %L::uuid', table_name, '20000000-0000-4000-8000-000000000002'); GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count <> 0 THEN RAISE EXCEPTION 'RLS cross-owner update succeeded for %', table_name; END IF;
    EXECUTE format('DELETE FROM %I WHERE user_id = %L::uuid', table_name, '20000000-0000-4000-8000-000000000002'); GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count <> 0 THEN RAISE EXCEPTION 'RLS cross-owner delete succeeded for %', table_name; END IF;
  END LOOP;
  BEGIN
    INSERT INTO guest_claim_assets (id, claim_operation_id, user_id, local_asset_id, ordinal, asset_kind, status, mime_type, size_bytes, checksum_sha256)
    VALUES ('33340000-0000-4000-8000-000000000003', '11120000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '33350000-0000-4000-8000-000000000003', 1, 'product', 'failed', 'image/png', 10, repeat('c', 64));
    RAISE EXCEPTION 'RLS cross-owner claim reference unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$$;

RESET ROLE;
ROLLBACK;
\echo 'Restricted-role two-user PostgreSQL RLS isolation probe passed.'
