#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
inventory="${repo_root}/docs/SUPABASE_PARITY.md"
functions_dir="${repo_root}/supabase/functions"

if [[ ! -f "${inventory}" ]]; then
  echo "Missing parity inventory: ${inventory}" >&2
  exit 1
fi

missing=0
while IFS= read -r function_name; do
  if ! grep -Fq "\`${function_name}\`" "${inventory}"; then
    echo "Supabase function missing from parity inventory: ${function_name}" >&2
    missing=1
  fi
done < <(
  find "${functions_dir}" -mindepth 1 -maxdepth 1 -type d ! -name '_shared' -exec basename {} \; | LC_ALL=C sort
)

if [[ "${missing}" -ne 0 ]]; then
  exit 1
fi

echo "Supabase function parity inventory covers every current function directory."
