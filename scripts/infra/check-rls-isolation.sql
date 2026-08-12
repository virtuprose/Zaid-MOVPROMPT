\set ON_ERROR_STOP on

BEGIN;

CREATE ROLE movprompt_rls_probe NOLOGIN;
GRANT USAGE ON SCHEMA public TO movprompt_rls_probe;
GRANT SELECT, INSERT ON
  creator_projects,
  creator_project_versions,
  creator_project_assets,
  generation_quotes,
  render_runs,
  exports,
  credit_accounts,
  credit_ledger,
  credit_reservations,
  notifications
TO movprompt_rls_probe;

INSERT INTO users (id, name, email)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'RLS Owner A', 'rls-owner-a@movprompt.test'),
  ('20000000-0000-4000-8000-000000000002', 'RLS Owner B', 'rls-owner-b@movprompt.test');

INSERT INTO creator_projects (id, user_id, title)
VALUES
  ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Owner A project'),
  ('22000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Owner B project');

INSERT INTO creator_project_versions
  (id, project_id, user_id, mode, version_number, configuration)
VALUES
  (
    '11100000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'template', 1, '{"owner":"a"}'::jsonb
  ),
  (
    '22200000-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'template', 1, '{"owner":"b"}'::jsonb
  );

INSERT INTO creator_project_assets
  (id, project_id, user_id, asset_kind, storage_bucket, object_key, mime_type, size_bytes)
VALUES
  (
    '11110000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'product', 'creator-assets', 'users/a/projects/a/assets/a', 'image/png', 10
  ),
  (
    '22220000-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'product', 'creator-assets', 'users/b/projects/b/assets/b', 'image/png', 10
  );

INSERT INTO generation_quotes
  (id, user_id, capability_alias, credits, breakdown, configuration_hash, expires_at)
VALUES
  (
    '11111000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'video.seedance.latest', 10, '[{"label":"test","credits":10}]'::jsonb,
    repeat('a', 64), now() + interval '5 minutes'
  ),
  (
    '22222000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'video.seedance.latest', 10, '[{"label":"test","credits":10}]'::jsonb,
    repeat('b', 64), now() + interval '5 minutes'
  );

INSERT INTO render_runs
  (id, project_id, project_version_id, user_id, idempotency_key, capability_alias, quote_id, quoted_credits)
VALUES
  (
    '11111100-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000001',
    '11100000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'rls-owner-a-render', 'video.seedance.latest',
    '11111000-0000-4000-8000-000000000001', 10
  ),
  (
    '22222200-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000002',
    '22200000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'rls-owner-b-render', 'video.seedance.latest',
    '22222000-0000-4000-8000-000000000002', 10
  );

INSERT INTO credit_accounts (user_id, balance)
VALUES
  ('10000000-0000-4000-8000-000000000001', 10),
  ('20000000-0000-4000-8000-000000000002', 10);

INSERT INTO credit_ledger
  (id, user_id, kind, delta, balance_after, reason, idempotency_key)
VALUES
  (
    '11111110-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'grant', 10, 10, 'rls_probe', 'rls-owner-a-ledger'
  ),
  (
    '22222220-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'grant', 10, 10, 'rls_probe', 'rls-owner-b-ledger'
  );

INSERT INTO credit_reservations
  (id, user_id, render_run_id, amount, idempotency_key)
VALUES
  (
    '11111111-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '11111100-0000-4000-8000-000000000001', 5, 'rls-owner-a-reservation'
  ),
  (
    '22222222-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '22222200-0000-4000-8000-000000000002', 5, 'rls-owner-b-reservation'
  );

INSERT INTO exports
  (id, project_id, project_version_id, render_run_id, user_id, idempotency_key, aspect_ratio, resolution, preset)
VALUES
  (
    '11111112-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000001',
    '11100000-0000-4000-8000-000000000001',
    '11111100-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'rls-owner-a-export', '9:16', '1080p', 'social'
  ),
  (
    '22222223-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000002',
    '22200000-0000-4000-8000-000000000002',
    '22222200-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'rls-owner-b-export', '9:16', '1080p', 'social'
  );

INSERT INTO notifications (id, user_id, type, title, body)
VALUES
  (
    '11111113-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'rls_probe', 'Owner A', 'Private A notification'
  ),
  (
    '22222224-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'rls_probe', 'Owner B', 'Private B notification'
  );

SET LOCAL ROLE movprompt_rls_probe;
SELECT set_config('movprompt.user_id', '10000000-0000-4000-8000-000000000001', true);

DO $$
DECLARE
  visible_count integer;
  table_name text;
  query text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'creator_projects',
    'creator_project_versions',
    'creator_project_assets',
    'generation_quotes',
    'render_runs',
    'exports',
    'credit_accounts',
    'credit_ledger',
    'credit_reservations',
    'notifications'
  ]
  LOOP
    query := format(
      'SELECT count(*) FROM %I WHERE user_id IN (%L::uuid, %L::uuid)',
      table_name,
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002'
    );
    EXECUTE query INTO visible_count;
    IF visible_count <> 1 THEN
      RAISE EXCEPTION 'RLS isolation failed for %, expected 1 visible row, got %', table_name, visible_count;
    END IF;
  END LOOP;

  BEGIN
    INSERT INTO creator_projects (id, user_id, title)
    VALUES (
      '33333333-0000-4000-8000-000000000003',
      '20000000-0000-4000-8000-000000000002',
      'Cross-owner insert must fail'
    );
    RAISE EXCEPTION 'RLS cross-owner insert unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END
$$;

RESET ROLE;
ROLLBACK;

\echo 'Two-user PostgreSQL RLS isolation probe passed for projects, versions, assets, quotes, runs, credits, exports and notifications.'
