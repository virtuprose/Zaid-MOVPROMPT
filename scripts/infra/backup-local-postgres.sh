#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ne 1 ]]; then
  echo "Usage: $0 /absolute/path/to/backup-directory" >&2
  exit 64
fi

destination="$1"
if [[ "${destination}" != /* || "${destination}" == "/" ]]; then
  echo "Backup destination must be an explicit absolute directory other than /." >&2
  exit 64
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${destination%/}/movprompt-local-${timestamp}"

umask 077
mkdir -p "${backup_dir}"

cd "${repo_root}"
docker compose exec -T postgres sh -ec \
  'pg_dump --format=custom --no-owner --no-privileges --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  > "${backup_dir}/postgres.dump"

if [[ ! -s "${backup_dir}/postgres.dump" ]]; then
  echo "PostgreSQL backup is empty." >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${backup_dir}/postgres.dump" > "${backup_dir}/SHA256SUMS"
else
  shasum -a 256 "${backup_dir}/postgres.dump" > "${backup_dir}/SHA256SUMS"
fi

echo "Local PostgreSQL backup created at ${backup_dir}."
echo "Object storage is not included; follow docs/runbooks/BACKUP_RESTORE.md."
