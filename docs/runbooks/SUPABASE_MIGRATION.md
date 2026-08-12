# Supabase to portable PostgreSQL migration runbook

## Status and purpose

This is a rehearsal and cutover control document. No source or target
credentials, live row counts, object inventories, migration rehearsal or
production cutover are evidenced in the repository today.

The safe tooling is documented in
[`scripts/migration/README.md`](../../scripts/migration/README.md). Supabase is
the retained legacy system until every gate below passes. Migration activity
must never delete, update, truncate, disable or overwrite legacy Supabase data.

## Roles required

Assign named people before a live rehearsal:

- migration commander and go/no-go owner;
- source database read-only operator;
- target database owner;
- object-storage operator;
- identity/OAuth owner;
- application release owner;
- credit/finance reconciliation approver;
- security/privacy reviewer;
- incident and rollback owner.

Record the source project, target environment, release SHA, portable migration
version, run ID, planned freeze/cutoff, backup identifiers, rollback deadline
and links to evidence in the release record. Do not put credentials there.

## Hard preconditions

1. A dedicated Supabase PostgreSQL role has only the required `SELECT` grants.
2. An independent database backup and object copy exist, with verified
   checksums and a demonstrated isolated restore.
3. Portable migrations apply cleanly to an empty database and to the approved
   rehearsal starting point.
4. The target uses private `creator-assets`, `creator-outputs` and
   `template-previews` buckets.
5. The Better Auth account strategy is approved for password, Google, Apple,
   email verification, session invalidation and exact draft recovery.
6. Every relation in the live inventory has an explicit migrate, archive,
   retain temporarily or accepted-defer decision.
7. A write-free final snapshot window or a tested delta/catch-up process is
   approved. A rehearsal taken while the product is writing cannot prove final
   parity.
8. `DATABASE_URL_POOLED` is reserved for application request traffic;
   migrations and reconciliation use `DATABASE_URL_DIRECT` only.
9. Rollback keeps Supabase intact and keeps the previous application artifacts
   deployable for the approved observation window.

If any precondition is missing, rehearse with synthetic/sanitized data only.

## Stage 1 — credential-free preflight

```bash
bun scripts/migration/migration.ts plan
bun scripts/migration/self-check.ts
```

Review `migration-plan.json` against the exact source and target migration
versions. A passing self-check proves only local algorithms and safety guards.
It does not prove live schema compatibility.

## Stage 2 — source inventory and immutable export

Create one encrypted, access-controlled run directory outside the repository.
Use the commands in the migration tooling README.

1. Capture live row counts for all known application, Auth and Storage
   relations.
2. Export the mapped core through the read-only source connection.
3. Retain the generated SQL, JSONL, inventory, plan snapshot and checkpoints.
4. Compare observed relations with the parity inventory and investigate every
   missing or unexpected table.
5. Never reuse the run directory after source bytes, mapping or schema change;
   start a new run so immutable checkpoints remain meaningful.

Source exports are personal and commercially sensitive data. Use encrypted
transport and storage, least-privilege access, an approved retention period and
audited deletion after the rollback window.

## Stage 3 — object copy and manifests

Use an approved read-only source process to mirror actual object bytes. The
repository tool hashes local mirrors but does not transfer objects.

For every source-to-target namespace:

1. Record source bucket, source prefix, target bucket and collision-free target
   prefix.
2. Copy to private target storage without deleting or moving source objects.
3. Download/read back the target bytes independently.
4. Produce sorted manifests containing normalized key, byte size and SHA-256.
5. Require zero missing, unexpected, size-mismatched and checksum-mismatched
   objects.

Do not mark database rows complete until their referenced target objects exist.
Do not store signed URLs in migrated rows; store bucket and object key.

## Stage 4 — transform and exception review

Run the deterministic transform. Review stable exception IDs and classify each
record:

- `blocking`: import cannot proceed;
- `warning`: requires documented approval or a follow-up transform;
- `info`: retained evidence only.

Known mandatory reviews include:

- Supabase Auth passwords, OAuth identities and sessions are not transformed;
- all users default to the portable `user` role; admin roles require an audited
  assignment process;
- legacy `lifetime_granted` is not mislabeled as purchased credits;
- legacy/unmapped application tables remain in Supabase until signed off;
- target object-prefix rewrites must be reflected consistently in row and
  object mappings.

The import dry-run must report zero blocking exceptions and valid transform
checkpoints before approval.

## Stage 5 — staging import and reconciliation

Apply reviewed portable migrations to a new staging target, then run the
insert-only import. Do not import into an unrecorded or shared developer
database.

After import:

1. Export the same selected target tables deterministically.
2. Reconcile row counts, stable primary keys and canonical row SHA-256.
3. Reconcile each user's credit balance and the aggregate balance.
4. Reconcile every object namespace by key, size and SHA-256.
5. Repeat the same import and prove reconciliation remains unchanged.
6. Validate constraints, referential integrity and application reads.
7. Run two-user authorization, auth/OAuth, project reload, generation recovery,
   charge/refund replay, export and signed-download tests.

Any mismatch is a stop condition. Never fix a mismatch by overwriting an
existing target row or editing a legacy Supabase row. Correct the mapping in a
new reviewed run and repeat the rehearsal.

## Stage 6 — final snapshot and cutover

Only after a successful production-shaped rehearsal:

1. Announce the approved write-free window or activate the tested delta process.
2. Record final cutoff time and source transaction/snapshot evidence.
3. Create a new final run; do not reuse rehearsal artifacts.
4. Repeat inventory, export, object copy, transform, import and reconciliation.
5. Obtain database, identity, finance, security/privacy and release sign-off.
6. Switch a bounded server-side feature flag or traffic cohort first.
7. Monitor auth failures, authorization denials, credit totals, generation
   operations, queue state, object failures and application errors by release.
8. Expand only after the agreed observation period has passed.

Supabase remains intact and access-controlled through the rollback window. Data
retirement is a separate, explicitly approved privacy and operations change.

## Rollback

Rollback means routing the application back to the previous immutable artifact
and Supabase path. It does not mean reversing inserts by deleting target rows or
restoring over either live database.

Trigger rollback for:

- authentication/account recovery failure;
- cross-user authorization or ownership failure;
- any credit, entitlement, render, refund or payment mismatch;
- missing or corrupted objects;
- unresolved queue/job divergence;
- missing telemetry or inability to reconcile the cutover window.

Preserve both systems and all run evidence, stop new writes to the unsafe path,
record the exact affected interval, and follow the incident and rollback
runbooks. Reconcile in-flight operations before retrying a new migration run.

## Sign-off evidence

Attach all of the following to the release record:

- run ID, plan checksum and release SHA;
- source and target schema/migration versions;
- source and target live inventories;
- source export and target export checksums;
- transform and reconciliation exception files;
- per-table reconciliation report;
- per-user and aggregate credit report;
- per-namespace object manifests and comparison reports;
- repeat-import result;
- auth/OAuth and two-user test evidence;
- backup/restore evidence;
- monitoring dashboard and alert links;
- named approvals, cutoff, observation window and rollback deadline.

Without this evidence, the migration is not complete and production traffic
must remain on the retained Supabase path.
