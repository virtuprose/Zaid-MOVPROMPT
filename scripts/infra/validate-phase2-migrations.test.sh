#!/usr/bin/env bash

set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
script="$root_dir/scripts/infra/validate-phase2-migrations.sh"
rls_script="$root_dir/scripts/infra/check-rls-isolation.sql"

expect_rejected_before_psql() {
  local url="$1"
  local label="$2"
  local output
  if output="$(MOVPROMPT_PHASE2_ADMIN_DATABASE_URL="$url" PSQL="${PSQL:-psql}" bash "$script" 2>&1)"; then
    echo "Expected unsafe ${label} URL to be rejected" >&2
    exit 1
  fi
  if [[ "$output" == *"psql sentinel"* ]]; then
    echo "Unsafe ${label} URL reached psql" >&2
    exit 1
  fi
}

sentinel_dir="$(mktemp -d)"
trap 'rm -rf "$sentinel_dir"' EXIT
cat > "$sentinel_dir/psql" <<'EOF'
#!/usr/bin/env bash
echo "psql sentinel" >&2
exit 99
EOF
chmod +x "$sentinel_dir/psql"
PSQL="$sentinel_dir/psql"

expect_rejected_before_psql "postgresql://local@production.example/postgres" "production host"
expect_rejected_before_psql "postgresql://local@127.0.0.1/development" "development database"
expect_rejected_before_psql "postgresql://local@127.0.0.1/movprompt_phase2_test_other" "non-admin database"

grep -Fq 'check-rls-isolation.sql' "$script"
grep -Fq 'current_user' "$rls_script"
grep -Fq 'rolbypassrls' "$rls_script"
grep -Fq 'rolsuper' "$rls_script"
grep -Fq "SET LOCAL movprompt.user_id" "$rls_script"

echo "Phase 2 migration guard preflight tests passed."
