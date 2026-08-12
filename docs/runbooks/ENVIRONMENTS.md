# Environment separation

## Environment contract

| Property | Local | Staging | Production |
|---|---|---|---|
| Purpose | Developer iteration | Production-shaped verification | Customer traffic |
| Data | Synthetic only | Synthetic or approved sanitized fixtures | Real customer data |
| Database | Local PostgreSQL volume | Dedicated instance/database | Dedicated HA instance/database |
| Storage | Local MinIO | Dedicated private buckets | Dedicated private buckets |
| Email | Mailpit only | Restricted test recipients/domain | Verified sender/domain |
| OAuth | Local callback clients | Dedicated staging clients | Dedicated production clients |
| AI providers | Mocks or bounded test keys | Separate capped keys | Production keys and limits |
| Payments | Never | Provider test mode | Provider live mode |
| Telemetry | Local console | Separate staging project | Production project and alerts |
| Secrets | Local untracked file/shell | Staging secret store | Production secret store |

Never point local or staging at production databases, buckets, OAuth clients,
payment accounts, webhook secrets or provider keys.

## Required server variables

The non-secret shape is documented in:

- `infra/environments/staging.example`
- `infra/environments/production.example`

Values must be injected by the deployment platform's secret manager. Do not
copy populated environment files into images or commit them.

The implemented API and worker currently require:

- `APP_ENV`
- `PUBLIC_APP_URL`, `WEB_ORIGIN`, `API_ORIGIN` and
  `CORS_ALLOWED_ORIGINS`
- `FEATURE_AUTHENTICATION` and `FEATURE_ASSETS`; assets cannot be enabled while
  authentication is disabled
- `DATABASE_URL_POOLED` for API request traffic
- `DATABASE_URL_DIRECT` for migrations and durable workers
- `DATABASE_SSL=require` outside local development
- `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
  `S3_FORCE_PATH_STYLE`, signed-URL TTLs and the exact private bucket names
  `creator-assets`, `creator-outputs`, `template-previews`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `EMAIL_FROM` and provider
  credentials
- `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_TRUSTED_ORIGINS` and
  Google/Apple client credentials
- `WORKER_ID`, outbox batch/lease/poll controls and render reconciliation delay
- approved AI provider keys
- payment API and webhook secrets
- telemetry endpoint/authentication

Client-side variables must be explicitly allowlisted. A `VITE_` prefix makes a
value public; it must never contain a server, provider, storage root, payment or
database secret.

`VITE_FEATURE_PORTABLE_AUTH=true` selects the Better Auth client in the web
bundle and therefore requires a reachable portable API at `VITE_API_ORIGIN`.
It is `true` in the local full-application example and should be `false` for a
web-only local session. Staging and production may enable it only after their
API, CORS, cookies and callback origins have passed the deployment smoke tests.

`BETTER_AUTH_URL` is the public API origin that serves `/api/auth/*`, not the
web-app origin. It must match `API_ORIGIN`. Better Auth callback URLs derive
from it, for example
`${BETTER_AUTH_URL}/api/auth/callback/google` and
`${BETTER_AUTH_URL}/api/auth/callback/apple`. Register exact staging and
production callbacks in separate OAuth applications.

The storage endpoint used for signing must be reachable by both the API and the
browser consuming each signed URL. Local Compose uses `minio.localhost` to meet
that requirement without publishing a bucket. Production should use the
private provider endpoint/custom domain approved for signed transfers.

The worker uses `DATABASE_URL_DIRECT` because pg-boss, outbox leasing and
reconciliation require durable direct PostgreSQL semantics. Do not route those
operations through a transaction pooler. Lease duration must exceed ordinary
enqueue latency, and shutdown grace must exceed the worker's graceful-stop
window.

## Validation

Load secrets into the process environment and validate names without printing
values:

```bash
scripts/infra/verify-environment.sh staging
scripts/infra/verify-environment.sh production
```

This structural check does not prove credentials work. Staging smoke tests must
exercise database, storage, SMTP, OAuth, provider and payment-test connections.
It also does not prove callbacks are registered in Google/Apple consoles or
that signed storage URLs are browser-reachable.

## Access controls

- Human production access uses individual SSO identities and MFA.
- API, worker, migration and read-only support roles are separate.
- Break-glass access is time-limited, alerted and reviewed.
- Secret reads and admin actions are audited.
- Credentials are rotated after suspected exposure and on a defined schedule.
- Developers do not receive production service-role credentials by default.
