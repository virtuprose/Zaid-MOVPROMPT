#!/usr/bin/env bash
set -euo pipefail

target_environment="${1:-}"
if [[ "${target_environment}" != "staging" && "${target_environment}" != "production" ]]; then
  echo "Usage: $0 <staging|production>" >&2
  exit 64
fi

required_variables=(
  APP_ENV
  PUBLIC_APP_URL
  WEB_ORIGIN
  API_ORIGIN
  CORS_ALLOWED_ORIGINS
  VITE_API_ORIGIN
  VITE_FEATURE_PORTABLE_AUTH
  FEATURE_AUTHENTICATION
  FEATURE_ASSETS
  FEATURE_GENERATION
  FEATURE_EXPORTS
  FEATURE_BILLING
  DATABASE_URL_POOLED
  DATABASE_URL_DIRECT
  DATABASE_SSL
  S3_ENDPOINT
  S3_REGION
  S3_ACCESS_KEY_ID
  S3_SECRET_ACCESS_KEY
  S3_FORCE_PATH_STYLE
  S3_ASSETS_BUCKET
  S3_OUTPUTS_BUCKET
  S3_PREVIEWS_BUCKET
  S3_UPLOAD_URL_TTL_SECONDS
  S3_DOWNLOAD_URL_TTL_SECONDS
  SMTP_HOST
  SMTP_PORT
  SMTP_SECURE
  SMTP_USER
  SMTP_PASSWORD
  EMAIL_FROM
  BETTER_AUTH_URL
  BETTER_AUTH_SECRET
  BETTER_AUTH_TRUSTED_ORIGINS
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  APPLE_CLIENT_ID
  APPLE_CLIENT_SECRET
  APPLE_APP_BUNDLE_IDENTIFIER
  WORKER_ID
  WORKER_SMOKE_TEST_ON_START
  WORKER_OUTBOX_BATCH_SIZE
  WORKER_OUTBOX_LEASE_MS
  WORKER_OUTBOX_POLL_INTERVAL_MS
  WORKER_RENDER_RECONCILIATION_DELAY_SECONDS
)

missing=0
for variable_name in "${required_variables[@]}"; do
  variable_value="${!variable_name:-}"
  if [[ -z "${variable_value}" || "${variable_value}" == *REQUIRED_* || "${variable_value}" == *example.invalid* ]]; then
    echo "Missing or placeholder value: ${variable_name}" >&2
    missing=1
  fi
done

if [[ "${missing}" -ne 0 ]]; then
  exit 1
fi

if [[ "${APP_ENV}" != "${target_environment}" ]]; then
  echo "APP_ENV=${APP_ENV} does not match requested environment ${target_environment}." >&2
  exit 1
fi

if [[ ! "${PUBLIC_APP_URL}" =~ ^https:// || ! "${WEB_ORIGIN}" =~ ^https:// || ! "${API_ORIGIN}" =~ ^https:// || ! "${VITE_API_ORIGIN}" =~ ^https:// || ! "${BETTER_AUTH_URL}" =~ ^https:// || ! "${S3_ENDPOINT}" =~ ^https:// ]]; then
  echo "Public, API, Vite API, Better Auth and object-storage URLs must use HTTPS outside local development." >&2
  exit 1
fi

if [[ "${PUBLIC_APP_URL%/}" != "${WEB_ORIGIN%/}" ]]; then
  echo "WEB_ORIGIN must match PUBLIC_APP_URL for the canonical browser origin." >&2
  exit 1
fi

if [[ "${BETTER_AUTH_URL%/}" != "${API_ORIGIN%/}" ]]; then
  echo "BETTER_AUTH_URL must match the public API_ORIGIN that serves /api/auth/*." >&2
  exit 1
fi

if [[ "${VITE_API_ORIGIN%/}" != "${API_ORIGIN%/}" ]]; then
  echo "VITE_API_ORIGIN must match the public API_ORIGIN used by the browser." >&2
  exit 1
fi

IFS=',' read -r -a cors_origins <<< "${CORS_ALLOWED_ORIGINS}"
for cors_origin in "${cors_origins[@]}"; do
  if [[ ! "${cors_origin}" =~ ^https:// ]]; then
    echo "Every CORS_ALLOWED_ORIGINS entry must use HTTPS outside local development." >&2
    exit 1
  fi
done

for variable_name in DATABASE_URL_POOLED DATABASE_URL_DIRECT; do
  variable_value="${!variable_name}"
  if [[ ! "${variable_value}" =~ ^postgres(ql)?:// ]]; then
    echo "${variable_name} must be a PostgreSQL connection string." >&2
    exit 1
  fi
done

if [[ "${DATABASE_SSL}" != "require" ]]; then
  echo "DATABASE_SSL must be require outside local development." >&2
  exit 1
fi

for boolean_variable in VITE_FEATURE_PORTABLE_AUTH FEATURE_AUTHENTICATION FEATURE_ASSETS FEATURE_GENERATION FEATURE_EXPORTS FEATURE_BILLING S3_FORCE_PATH_STYLE SMTP_SECURE WORKER_SMOKE_TEST_ON_START; do
  boolean_value="${!boolean_variable}"
  if [[ "${boolean_value}" != "true" && "${boolean_value}" != "false" ]]; then
    echo "${boolean_variable} must be true or false." >&2
    exit 1
  fi
done

if [[ "${FEATURE_ASSETS}" == "true" && "${FEATURE_AUTHENTICATION}" != "true" ]]; then
  echo "FEATURE_ASSETS=true requires FEATURE_AUTHENTICATION=true." >&2
  exit 1
fi

if [[ "${FEATURE_GENERATION}" == "true" ]]; then
  if [[ "${FEATURE_AUTHENTICATION}" != "true" ]]; then
    echo "FEATURE_GENERATION=true requires FEATURE_AUTHENTICATION=true." >&2
    exit 1
  fi
  generation_variables=(
    GENERATION_PRICING_VERSION
    GENERATION_QUOTE_TTL_SECONDS
    GENERATION_SEEDANCE_CREDITS_PER_SECOND
    GENERATION_OMNI_FLASH_CREDITS_PER_SECOND
    GENERATION_NANO_BANANA_CREDITS_PER_IMAGE
  )
  for variable_name in "${generation_variables[@]}"; do
    if [[ -z "${!variable_name:-}" ]]; then
      echo "FEATURE_GENERATION=true requires ${variable_name}." >&2
      exit 1
    fi
  done
fi

if [[ "${VITE_FEATURE_PORTABLE_AUTH}" == "true" && "${FEATURE_AUTHENTICATION}" != "true" ]]; then
  echo "VITE_FEATURE_PORTABLE_AUTH=true requires FEATURE_AUTHENTICATION=true." >&2
  exit 1
fi

if (( ${#BETTER_AUTH_SECRET} < 32 )); then
  echo "BETTER_AUTH_SECRET must contain at least 32 characters." >&2
  exit 1
fi

if [[ "${S3_ASSETS_BUCKET}" != "creator-assets" || "${S3_OUTPUTS_BUCKET}" != "creator-outputs" || "${S3_PREVIEWS_BUCKET}" != "template-previews" ]]; then
  echo "S3 bucket names must be creator-assets, creator-outputs and template-previews." >&2
  exit 1
fi

for integer_variable in SMTP_PORT S3_UPLOAD_URL_TTL_SECONDS S3_DOWNLOAD_URL_TTL_SECONDS WORKER_OUTBOX_BATCH_SIZE WORKER_OUTBOX_LEASE_MS WORKER_OUTBOX_POLL_INTERVAL_MS WORKER_RENDER_RECONCILIATION_DELAY_SECONDS; do
  integer_value="${!integer_variable}"
  if [[ ! "${integer_value}" =~ ^[0-9]+$ || "${integer_value}" -lt 1 ]]; then
    echo "${integer_variable} must be a positive integer." >&2
    exit 1
  fi
done

for ttl_variable in S3_UPLOAD_URL_TTL_SECONDS S3_DOWNLOAD_URL_TTL_SECONDS; do
  ttl_value="${!ttl_variable}"
  if [[ "${ttl_value}" -gt 3600 ]]; then
    echo "${ttl_variable} cannot exceed 3600 seconds." >&2
    exit 1
  fi
done

if [[ "${target_environment}" == "production" ]]; then
  for variable_name in PUBLIC_APP_URL WEB_ORIGIN API_ORIGIN VITE_API_ORIGIN CORS_ALLOWED_ORIGINS DATABASE_URL_POOLED DATABASE_URL_DIRECT S3_ENDPOINT BETTER_AUTH_URL BETTER_AUTH_TRUSTED_ORIGINS; do
    variable_value="${!variable_name}"
    if [[ "${variable_value}" == *localhost* || "${variable_value}" == *127.0.0.1* ]]; then
      echo "Production value cannot point to a local address: ${variable_name}" >&2
      exit 1
    fi
  done
fi

echo "${target_environment} environment contract is complete. Secret values were not printed."
