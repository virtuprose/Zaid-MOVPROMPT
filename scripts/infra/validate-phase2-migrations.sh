#!/usr/bin/env bash

set -euo pipefail

admin_url="${MOVPROMPT_PHASE2_ADMIN_DATABASE_URL:-}"
if [[ -z "$admin_url" ]]; then
  echo "MOVPROMPT_PHASE2_ADMIN_DATABASE_URL is required." >&2
  exit 1
fi

read -r admin_host admin_database < <(node -e '
const input = process.argv[1];
const parsed = new URL(input);
const database = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
console.log(`${parsed.hostname.toLowerCase()} ${database.toLowerCase()}`);
' "$admin_url")

if [[ "$admin_host" != "127.0.0.1" && "$admin_host" != "localhost" ]]; then
  echo "Phase 2 migration validation only permits a local PostgreSQL administrative endpoint." >&2
  exit 1
fi

if [[ "$admin_database" != "postgres" ]]; then
  echo "The administrative endpoint must target the postgres database." >&2
  exit 1
fi

if [[ "$admin_url" =~ (production|staging|development|prod|stage|dev) ]]; then
  echo "Refusing an administrative endpoint that contains a shared-environment marker." >&2
  exit 1
fi

database_name="movprompt_phase2_test_$(date +%s)_${RANDOM}"
if [[ ! "$database_name" =~ ^movprompt_phase2_test_[a-z0-9_]+$ ]]; then
  echo "Generated disposable database name is invalid." >&2
  exit 1
fi

database_url="$(node -e '
const parsed = new URL(process.argv[1]);
parsed.pathname = `/${process.argv[2]}`;
process.stdout.write(parsed.toString());
' "$admin_url" "$database_name")"

drop_database() {
  psql "$admin_url" -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${database_name}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
  psql "$admin_url" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${database_name}\";" >/dev/null 2>&1 || true
}
trap drop_database EXIT

server_version="$(psql "$admin_url" -v ON_ERROR_STOP=1 -Atc 'SHOW server_version_num')"
if (( server_version < 170000 || server_version >= 180000 )); then
  echo "Phase 2 migration validation requires PostgreSQL 17; found server version ${server_version}." >&2
  exit 1
fi

psql "$admin_url" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${database_name}\";" >/dev/null
DATABASE_URL_DIRECT="$database_url" bun run db:migrate >/dev/null
DATABASE_URL_DIRECT="$database_url" bun scripts/infra/check-portable-database.ts >/dev/null

assert_query() {
  local description="$1"
  local statement="$2"
  if [[ "$(psql "$database_url" -v ON_ERROR_STOP=1 -Atc "$statement")" != "1" ]]; then
    echo "Migration invariant failed: ${description}" >&2
    exit 1
  fi
}

assert_query "guest claim tables exist" "SELECT (to_regclass('public.guest_claim_operations') IS NOT NULL AND to_regclass('public.guest_claim_assets') IS NOT NULL)::int;"
assert_query "guest claim owner RLS is forced" "SELECT ((SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'public.guest_claim_operations'::regclass) AND (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'public.guest_claim_assets'::regclass))::int;"
assert_query "claim operation owner tuple foreign keys exist" "SELECT (SELECT count(*) >= 2 FROM pg_constraint WHERE conrelid = 'public.guest_claim_operations'::regclass AND contype = 'f')::int;"
assert_query "claim asset operation owner foreign key exists" "SELECT (SELECT count(*) >= 1 FROM pg_constraint WHERE conrelid = 'public.guest_claim_assets'::regclass AND contype = 'f')::int;"
assert_query "claim operations have a user intent uniqueness index" "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'guest_claim_operations' AND indexdef LIKE '%(user_id, pending_generation_id)%')::int;"
assert_query "claim assets have ordered checkpoint uniqueness" "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'guest_claim_assets' AND indexdef LIKE '%(claim_operation_id, ordinal)%')::int;"
assert_query "claim tables never persist signed URLs" "SELECT (NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('guest_claim_operations', 'guest_claim_assets') AND column_name ILIKE '%signed%url%'))::int;"

DATABASE_URL_DIRECT="$database_url" bun run db:migrate >/dev/null
echo "Phase 2 migration validation passed on a disposable PostgreSQL 17 database."
