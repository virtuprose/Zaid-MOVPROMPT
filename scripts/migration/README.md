# MovPrompt Supabase migration tooling

This directory contains a repeatable, evidence-producing scaffold for moving
the application-owned creator data from Supabase to portable PostgreSQL and
S3-compatible storage. It is not a cutover command and it does not delete,
update or disable Supabase.

## Safety contract

- `plan`, dry-run `export`, dry-run `import`, fixture self-checks, artifact
  inventory and local object manifests need no credentials.
- A source connection is opened only with `--execute` and
  `SUPABASE_SOURCE_DATABASE_URL`. The process sets PostgreSQL
  `default_transaction_read_only=on`; exports also use a repeatable-read,
  read-only transaction.
- Target imports use only `DATABASE_URL_DIRECT`, run in one transaction and
  issue `INSERT ... ON CONFLICT DO NOTHING`. They do not issue a persistent
  `UPDATE`, `DELETE`, `TRUNCATE`, `DROP` or conflict update.
- A selected source dataset that is absent creates a blocking exception.
- A target import is refused when transform exception evidence is absent,
  blocking exceptions exist, or an artifact differs from its transform
  checkpoint.
- Completed export and transform artifacts are immutable within a run. Changed
  inputs or outputs require a new run directory.
- Reconciliation is exact by stable primary key and canonical row SHA-256, not
  just by totals. Credit balances are also compared per user and in aggregate.
- Object manifests use object key, byte size and SHA-256 of the actual bytes.

Use a dedicated database role with explicit `SELECT` grants for the Supabase
source even though the client also enforces read-only mode. Do not use an
application service-role key as a PostgreSQL connection string.

## What is mapped

`migration-plan.json` is the reviewed contract. It maps the portable core:

- users (UUID/profile only);
- published template records and immutable versions;
- creator projects, versions and private asset metadata;
- generation quotes, render operations, entitlements and exports;
- credit accounts and credit ledger.

The live inventory also counts known legacy application, Auth and Storage
relations so unmapped data remains visible. It does not pretend to migrate
passwords, OAuth identities, sessions, admin roles, legacy Director data,
notifications, email state, old video jobs or other unmapped features. Those
need an explicit retain, archive, transform or defer decision before cutover.

## Requirements

- Bun for all local and dry-run commands.
- PostgreSQL `psql` only for commands using `--execute`.
- A secure directory outside the repository for real migration artifacts.
- An independently tested database and object backup before a live rehearsal.

Real artifacts contain emails, account balances and customer metadata. Start a
private shell with `umask 077`, keep the run directory encrypted at rest, do not
commit it, and restrict access to named migration operators.

## Credential-free validation

```bash
bun scripts/migration/migration.ts plan
bun scripts/migration/self-check.ts
```

The self-check uses only synthetic `.example.test` fixtures. It proves dry-run
behavior, transformation, checkpoint resume, insert-only import planning,
table/credit reconciliation, object checksums, mismatch detection and changed
input rejection. It does not prove a live database, storage provider or schema
is compatible.

## Artifact layout

```text
RUN_DIR/
  run.json                         immutable run identity and safety contract
  migration-plan.snapshot.json     reviewed mapping snapshot
  checkpoints.json                 idempotent step checksums
  inventory-live-source.json       source row-count inventory
  inventory-source.json            exported source artifact inventory
  inventory-target.json            exported target artifact inventory
  source/*.jsonl                   deterministic read-only source exports
  target/*.jsonl                   transformed expected target rows
  actual-target/*.jsonl            deterministic target exports
  exceptions/*.jsonl               stable warning/blocking exception records
  generated/                       generated psql scripts and encoded staging data
  reconciliation.json              table, credit and optional object result
```

JSONL rows are canonicalized before transformation/reconciliation. Inventory
files include row counts and dataset SHA-256. `checkpoints.json` binds each
completed transform to its exact source and output checksum.

## Rehearsal sequence

Choose an absolute, secure location outside the checkout:

```bash
export MOVPROMPT_MIGRATION_RUN=/absolute/private/path/movprompt-rehearsal-001
umask 077
bun scripts/migration/migration.ts init --run-dir "$MOVPROMPT_MIGRATION_RUN" --run-id rehearsal-001
bun scripts/migration/migration.ts plan
```

Preview source export without credentials:

```bash
bun scripts/migration/migration.ts export \
  --run-dir "$MOVPROMPT_MIGRATION_RUN" --side source
```

Inject `SUPABASE_SOURCE_DATABASE_URL` from the approved secret store, without
printing it or storing it in the run directory, then capture live counts and a
deterministic core export:

```bash
bun scripts/migration/migration.ts inventory \
  --run-dir "$MOVPROMPT_MIGRATION_RUN" --side source --execute
bun scripts/migration/migration.ts export \
  --run-dir "$MOVPROMPT_MIGRATION_RUN" --side source --execute
```

Transform locally and inspect every exception before proceeding:

```bash
bun scripts/migration/migration.ts transform \
  --run-dir "$MOVPROMPT_MIGRATION_RUN"
bun scripts/migration/migration.ts import \
  --run-dir "$MOVPROMPT_MIGRATION_RUN"
```

The second command is still a dry-run. Its JSON must show
`"exceptionEvidencePresent": true`, `"blockingExceptionCount": 0`, every
`"transformCheckpointValidated": true`, and `"executable": true`.

After applying portable migrations to a new staging database, inject that
database's `DATABASE_URL_DIRECT` and perform the insert-only import:

```bash
bun scripts/migration/migration.ts import \
  --run-dir "$MOVPROMPT_MIGRATION_RUN" --execute
bun scripts/migration/migration.ts export \
  --run-dir "$MOVPROMPT_MIGRATION_RUN" --side target --execute
bun scripts/migration/migration.ts reconcile \
  --run-dir "$MOVPROMPT_MIGRATION_RUN"
```

`reconcile` exits with code `2` when blocking differences exist. Repeating the
same import is expected to insert nothing on conflicts; export and reconcile
must still pass. Existing conflicting rows are never overwritten—the mismatch
is reported for investigation.

Use `--tables users,creditAccounts,creditLedger` to rehearse a bounded set.
Use the same table selection for export, transform, import, target export and
reconcile; otherwise missing artifacts correctly fail reconciliation.

## Object manifests

The tool deliberately does not download, upload or delete objects. Mirror each
source bucket to a protected local directory with an approved read-only
Supabase Storage process, copy it to the private target, then hash both sides:

```bash
bun scripts/migration/migration.ts object-manifest \
  --root /absolute/source-mirror/creator-assets \
  --bucket creator-assets \
  --out "$MOVPROMPT_MIGRATION_RUN/source-creator-assets.json"
bun scripts/migration/migration.ts object-manifest \
  --root /absolute/target-mirror/creator-assets \
  --bucket creator-assets \
  --out "$MOVPROMPT_MIGRATION_RUN/target-creator-assets.json"
bun scripts/migration/migration.ts object-reconcile \
  --source "$MOVPROMPT_MIGRATION_RUN/source-creator-assets.json" \
  --target "$MOVPROMPT_MIGRATION_RUN/target-creator-assets.json" \
  --out "$MOVPROMPT_MIGRATION_RUN/reconcile-creator-assets.json"
```

Run this independently for `creator-assets`, `creator-outputs` and
`template-previews`. Legacy `director-uploads` and `welcome-popup-media` need a
reviewed, collision-free target prefix. Apply the same normalized `--prefix`
when producing both source and target-subtree manifests so the compared object
keys are identical.

Do not treat provider ETags as SHA-256. Manifests must hash the downloaded bytes
and object mirrors must preserve exact bytes.

## Exit criteria

A rehearsal passes only when:

- source inventory, export checksums and exceptions are retained;
- no blocking transform exception remains;
- target schema is the reviewed migration version;
- target export exactly reconciles all selected rows;
- every user's credit balance and aggregate balance match;
- every migrated object namespace matches by key, size and SHA-256;
- a second insert-only import remains idempotent and reconciliation still passes;
- auth/account cutover and all unmapped datasets have signed decisions;
- rollback retains Supabase and its independent backup for the approved window.
