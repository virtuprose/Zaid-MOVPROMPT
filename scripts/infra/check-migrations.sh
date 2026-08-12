#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
migration_dir="${1:-${repo_root}/supabase/migrations}"

if [[ ! -d "${migration_dir}" ]]; then
  echo "Migration directory does not exist: ${migration_dir}" >&2
  exit 1
fi

temp_dir="$(mktemp -d)"
trap 'rm -rf "${temp_dir}"' EXIT
version_file="${temp_dir}/versions"
file_list="${temp_dir}/files"

find "${migration_dir}" -maxdepth 1 -type f -name '*.sql' -print | LC_ALL=C sort > "${file_list}"

if [[ ! -s "${file_list}" ]]; then
  echo "No SQL migrations found in ${migration_dir}." >&2
  exit 1
fi

while IFS= read -r migration_file; do
  filename="$(basename "${migration_file}")"
  if [[ ! "${filename}" =~ ^([0-9]{14})_[A-Za-z0-9._-]+\.sql$ ]]; then
    echo "Invalid migration filename: ${filename}" >&2
    echo "Expected: YYYYMMDDHHMMSS_description.sql" >&2
    exit 1
  fi

  if [[ ! -s "${migration_file}" ]]; then
    echo "Migration is empty: ${filename}" >&2
    exit 1
  fi

  if grep -nE '^(<{7}|={7}|>{7})' "${migration_file}" >/dev/null; then
    echo "Merge-conflict marker found in ${filename}." >&2
    exit 1
  fi

  printf '%s\n' "${BASH_REMATCH[1]}" >> "${version_file}"
done < "${file_list}"

duplicate_versions="$(LC_ALL=C sort "${version_file}" | uniq -d)"
if [[ -n "${duplicate_versions}" ]]; then
  echo "Duplicate migration versions:" >&2
  echo "${duplicate_versions}" >&2
  exit 1
fi

migration_count="$(wc -l < "${file_list}" | tr -d ' ')"
echo "Migration inventory check passed for ${migration_count} files."
echo "This is a structural check only; staging must still execute migrations against the target database."
