# Supabase replacement parity inventory

## Purpose

This is the authoritative inventory for replacing Supabase without silently
losing behavior. It is a scaffold, not a completion claim. An item moves to
`Verified` only with code, automated tests, staging evidence, rollback notes and
an accountable owner.

Statuses:

- `Inventory` — current dependency has been identified.
- `Planned` — target contract is agreed but not implemented.
- `Implemented` — code exists but staging parity is not proven.
- `Verified` — acceptance evidence is linked and rollback is tested.
- `Retained` — Supabase remains the deliberate production provider.

## Platform parity matrix

| Surface | Current dependency | Portable acceptance criteria | Status | Owner/evidence |
|---|---|---|---|---|
| PostgreSQL schema | Supabase migrations under `supabase/migrations` | Portable migrations apply from empty DB and upgrade a production-shaped copy | Inventory | Unassigned |
| Constraints and authorization | RLS, policies, composite ownership FKs, security-definer RPCs | Two-user isolation and cross-project FK attack suite passes | Inventory | Unassigned |
| Browser database access | Supabase client | Browser calls an authenticated API; no privileged DB credentials ship to clients | Inventory | Unassigned |
| Email/password auth | Supabase Auth | Signup, verification, login, reset, logout, rotation and abuse controls pass | Inventory | Unassigned |
| Google and Apple OAuth | Lovable/Supabase session handoff | Safe callback validation and exact guest-draft recovery matrix passes | Inventory | Unassigned |
| Session lifecycle | Supabase tokens/local storage | Rotation, revocation, expiry, device logout and CSRF/XSS threat model pass | Inventory | Unassigned |
| Admin authorization | Supabase role RPCs | Server-side RBAC, MFA, audit log and forced-revocation tests pass | Inventory | Unassigned |
| Object storage | Supabase Storage | Private S3 buckets, checksums, MIME/size limits, retention and signed URLs pass | Inventory | MinIO local only |
| Realtime credits | `postgres_changes` on credit state | Authorized balance updates survive reconnect and never control charging | Inventory | Unassigned |
| Realtime notifications | `postgres_changes` on notifications | Per-user delivery, reconnect and read state pass | Inventory | Unassigned |
| Realtime model availability | `postgres_changes` on model state | Server-controlled capability changes reach clients with safe defaults | Inventory | Unassigned |
| Edge Functions | Deno Supabase Functions | API/worker endpoints have equivalent auth, idempotency, timeout and tests | Inventory | See function inventory |
| Scheduled work | Function scheduler/service-role calls | Durable scheduler has leases, retries, alerts and replay-safe operations | Inventory | Unassigned |
| Service role | Supabase service-role key | Separate least-privilege API, worker, migration and admin roles | Inventory | Unassigned |
| Transactional email | Function queue and provider | Durable outbox, suppression, unsubscribe, DKIM/SPF/DMARC and retries pass | Inventory | Mailpit local only |
| Generated DB types | Supabase generated TypeScript | Portable schema/client types generated in CI and drift checked | Inventory | Unassigned |
| Backups | Supabase-hosted behavior not evidenced here | DB and object backups meet agreed RPO/RTO and quarterly restore drill passes | Planned | Runbook only |

## Storage inventory

| Bucket | Current use | Portable target | Status |
|---|---|---|---|
| `director-uploads` | Legacy prompt, brand, character, reference and audio assets | Private legacy-assets namespace with migration checksums | Inventory |
| `creator-assets` | Product uploads | Private S3 bucket/prefix; paths stored, signed URLs issued on demand | Local bucket only |
| `creator-outputs` | Copied generated videos | Private S3 bucket/prefix with validated media and lifecycle rules | Local bucket only |
| `template-previews` | Published template preview media | Private authoring bucket with controlled CDN delivery | Local bucket only |

The local MinIO bootstrap creates only the two creator buckets. It does not
migrate `director-uploads`.

## Edge Function inventory

### Identity and administration

- `admin-delete-user`
- `admin-force-signout`
- `admin-list-users-meta`
- `admin-resend-welcome`
- `admin-revoke-all-sessions`
- `admin-send-password-reset`
- `toggle-user-status`
- `auth-email-hook`

Target: authenticated API endpoints plus an auditable admin service. Destructive
operations require MFA/step-up authorization and idempotency where applicable.

### Email lifecycle

- `handle-email-suppression`
- `handle-email-unsubscribe`
- `preview-transactional-email`
- `process-email-queue`
- `send-transactional-email`

Target: database outbox, worker delivery, signed provider webhooks, suppression
and unsubscribe enforcement.

### Creator generation lifecycle

- `generation-quote`
- `start-generation`
- `generation-status`
- `cancel-generation`
- `reconcile-generation`
- `generate-video`
- `generate-preset-preview`
- `check-model-availability`
- `recommend-animate-model`

Target: API commands and durable worker jobs. Quote/configuration binding,
approved capability enforcement, charging, refunds and provider transitions
must be transactional and replay-safe.

### Product, image and prompt processing

- `scrape-product-url`
- `analyze-ad-concept`
- `analyze-brand-image`
- `analyze-character-image`
- `analyze-scene`
- `critique-prompt`
- `enhance-description`
- `generate-image-prompt`
- `generate-prompt`
- `generate-reference-image`
- `moderate-image`
- `plan-storyboard`
- `transcribe-audio`
- `write-ad-scene`

Target: authenticated or explicitly public API endpoints with durable rate
limits, SSRF protection, upload validation, provider timeouts and structured
error contracts.

### Story and orchestration workflows

- `story-bundle`
- `story-render`
- `story-stitch`
- `story-stitch-cancel`

Target: version-aware jobs with partial-failure recovery, cancellation leases,
deterministic stitch validation and immutable outputs.

### Integration surface

- `mcp`

Target: explicitly scoped integration API with tenant authorization, rate
limits, audit logging, credential rotation and documented compatibility.

## Database/RPC migration checklist

Before database cutover, inventory and map every:

- table, column, enum, index, check and foreign key;
- RLS policy and authenticated/anonymous/service-role grant;
- trigger and security-definer function;
- credit, entitlement, quote, render and refund idempotency constraint;
- scheduled job and email outbox transition;
- storage row/bucket policy;
- auth schema reference and generated type dependency.

Supabase migrations must not be run blindly on vanilla PostgreSQL because they
can reference Supabase-owned `auth`, `storage`, roles and extensions. Portable
migrations need their own clean-install, upgrade and rollback/forward-fix tests.

## Per-capability sign-off template

Copy this block for each row before marking it `Verified`:

```text
Capability:
Owner:
Target release:
Code/PR:
Automated tests:
Staging evidence:
Security review:
Data reconciliation:
Observability/alerts:
Rollback test:
Known differences accepted by:
Verified date:
```
