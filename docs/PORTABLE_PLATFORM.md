# MovPrompt portable platform foundation

## Status

This repository now contains a local, provider-neutral infrastructure
foundation. It is **not** a completed Supabase replacement and it is **not** a
production deployment definition.

| Capability | Current state | Portable target |
|---|---|---|
| Web application | Existing Vite application | Static artifact behind HTTPS/CDN |
| Database | Supabase PostgreSQL | PostgreSQL 17 |
| Authentication | Supabase remains on legacy web routes | Better Auth API is implemented behind `FEATURE_AUTHENTICATION` |
| Object storage | Supabase remains for legacy assets | Authenticated private asset API is implemented behind `FEATURE_ASSETS` |
| Background work | Legacy Edge Functions still exist | PostgreSQL outbox plus pg-boss worker is implemented |
| Generation | Legacy creator calls remain | Portable quote/run/status/cancel APIs and durable lifecycle are implemented but disabled until approved provider and pricing configuration exists |
| Email | Legacy functions still exist | Better Auth email uses SMTP; Mailpit locally |
| Realtime | Supabase database changes | WebSocket/SSE or managed pub/sub |
| Billing | Not implemented | Hosted checkout plus signed webhooks |

The detailed replacement checklist is in
[SUPABASE_PARITY.md](./SUPABASE_PARITY.md).

## Local foundation

The default Compose project starts only services that work now:

```bash
docker compose --env-file infra/environments/local.example config --quiet
docker compose --env-file infra/environments/local.example up -d
docker compose ps
```

Endpoints are bound to loopback intentionally:

- PostgreSQL: `127.0.0.1:5432`
- MinIO API: `127.0.0.1:9000`
- MinIO console: `127.0.0.1:9001`
- Mailpit SMTP: `127.0.0.1:1025`
- Mailpit UI: `127.0.0.1:8025`
- Application API: `127.0.0.1:8787` with the `application` profile

The MinIO bootstrap container creates private `creator-assets`,
`creator-outputs`, and `template-previews` buckets. Local credentials are
development-only.

Stop the services without deleting data:

```bash
docker compose --env-file infra/environments/local.example down
```

Deleting named volumes destroys local database, object and email data. That is
not part of the normal stop procedure.

## Local API, authentication, assets and worker

`api`, `migrate` and `worker` are behind the explicit `application` profile so
developers can still run infrastructure by itself. The profile now:

- builds locked API and worker images without copying `.env` files;
- waits for PostgreSQL and applies portable migrations through a one-shot
  `migrate` service;
- starts Better Auth email/password support with Mailpit delivery;
- exposes authenticated private asset signing/completion/download routes;
- starts the durable outbox dispatcher and pg-boss worker;
- leaves generation, exports and billing disabled by default;
- runs application containers as non-root with read-only filesystems.

The portable frontend auth client is build-time gated by
`VITE_FEATURE_PORTABLE_AUTH`. The committed local example sets it to `true`
for the full application profile. Set it to `false` when running the web app
without that profile; otherwise sign-in requests will target an API that is not
running. `VITE_API_ORIGIN` must be the browser-reachable API origin
(`http://localhost:8787` locally), not the Docker service name.

Start the full local backend:

```bash
docker compose --env-file infra/environments/local.example \
  --profile application up -d --build
docker compose --env-file infra/environments/local.example \
  --profile application ps
```

Useful checks:

```bash
curl --fail http://127.0.0.1:8787/healthz
curl --fail http://127.0.0.1:8787/api/v1/health
curl --fail http://127.0.0.1:8787/api/v1/feature-flags
```

The known local Better Auth secret and MinIO credentials are development-only.
Google and Apple remain unavailable until matching local client ID/secret pairs
and exact callbacks are supplied. Email verification and reset messages appear
in Mailpit at `http://127.0.0.1:8025`.

Generation remains deliberately fail-closed. Enabling `FEATURE_GENERATION`
also requires an approved capability mapping and all relevant authoritative
pricing variables. Blank values never produce a client fallback price. Set
those values only after the live provider bake-off and commercial review.

`minio.localhost` is deliberately used inside the API container: Docker DNS
routes it to MinIO while browsers route the `.localhost` name to loopback. This
keeps presigned upload/download URLs reachable from both sides.

The images are deterministic local/rehearsal artifacts, not a production image
release claim. Production still needs dependency pruning, registry scanning,
SBOM/provenance, immutable digests and deployment-platform secret injection.

## Portable backend boundaries

The replacement API owns these security boundaries:

1. Authenticate every user and admin operation server-side.
2. Verify project ownership for every child resource.
3. Create authoritative generation quotes and bind submissions to them.
4. Enforce the approved model capability registry server-side.
5. Charge and refund through idempotent database transactions.
6. Write private object paths to the database and issue short-lived URLs on
   demand.
7. Submit durable jobs before invoking providers and reconcile orphaned jobs.
8. Verify webhook signatures, timestamps and replay keys.
9. Emit structured, correlated audit and operational events.

Direct browser access to privileged database credentials, provider keys, SMTP
credentials or object-storage root credentials is prohibited.

## Data and migration strategy

Use an expand-and-contract migration process:

1. Inventory the Supabase schema, functions, buckets, auth flows and realtime
   subscriptions.
2. Make legacy migrations executable in an isolated Supabase-compatible
   staging environment and record their checksums.
3. Write portable PostgreSQL migrations for application-owned schemas. Do not
   assume `auth`, `storage`, Supabase extensions or service-role behavior exists.
4. Backfill by immutable primary key and checksum migrated rows/assets.
5. Dual-read only when it is measurable; avoid uncontrolled dual-write.
6. Run two-user authorization, credit-race and generation-recovery tests.
7. Cut over one bounded capability at a time behind a working server-side flag.
8. Retain the old path until reconciliation and rollback windows close.

`scripts/infra/check-migrations.sh` checks migration inventory structure. It
does not execute or prove migration safety. Staging execution and restore tests
remain mandatory.

## Environment and deployment model

Local, staging and production must use different:

- databases and database roles;
- object-storage accounts and buckets;
- OAuth applications and callback URLs;
- email credentials and sender identities;
- provider keys, webhook secrets and payment accounts;
- encryption/signing secrets;
- domains, telemetry projects and alert destinations.

See [ENVIRONMENTS.md](./runbooks/ENVIRONMENTS.md) and
[DEPLOYMENT.md](./runbooks/DEPLOYMENT.md). The repository intentionally does not
name a production cloud or claim a deployment adapter; that decision remains
open.

## Minimum production gates

Production remains blocked until all of the following are demonstrated:

- clean, reviewed commit and green CI/security checks;
- reproducible immutable web/API/worker artifacts;
- target migrations executed in staging and a restore drill completed;
- Supabase parity inventory signed off or explicitly deferred per item;
- OAuth, authorization/RLS-equivalent and admin MFA tests passed;
- approved-provider success/failure/cancel/duplicate tests passed;
- exact quote, charge, entitlement and refund race tests passed;
- private asset/output retention and signed-download tests passed;
- checkout/webhook/reconciliation path passed in test mode;
- production telemetry, alerts, incident ownership and rollback path verified;
- WCAG, GCC localization, privacy and legal release gates passed.

Local health is evidence for development only; it is not evidence of external
DNS, TLS, provider, payment, backup or production readiness.
