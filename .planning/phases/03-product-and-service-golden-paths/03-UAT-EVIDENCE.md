# Phase 3 Provisioned UAT Evidence

**Observed:** 2026-08-21

## Status

**NOT VERIFIED — Phase 03 remains formally incomplete.**

The local provisioning precondition is only partially available: PostgreSQL 17, MinIO, the API health endpoint, and the web interface respond. The required Mailpit service is unavailable, no worker heartbeat/paused render-work queue was demonstrated, and the API advertises generation as disabled with both video capabilities unavailable. An authoritative quote and a durable accepted render run therefore cannot be exercised safely.

No provider submission, provider request, provider attempt, or paid cost was made.

## Latest rerun

On 2026-08-21, the final root verification reran `bun scripts/infra/run-phase3-provisioned-uat.ts`. The loopback API at `127.0.0.1:8787` was not running, so the harness failed before any mutation with a connection-refused readiness result. The same pass confirmed the web creator remained available at `127.0.0.1:8080` and the automated creator smoke, workspace typecheck, production build, bundle gate, and evidence-redaction check all passed.

This newer observation tightens the blocker: the required services are not currently provisioned together. It does not invalidate the earlier partial observations below, and it does not authorize a simulated or paid generation attempt.

## Read-only observations

| Boundary | Observation | Status |
|---|---|---|
| PostgreSQL | Loopback PostgreSQL 17 accepts a read-only readiness check. | observed |
| Private storage | MinIO liveness endpoint responds. | observed |
| API | Health endpoint reports the API and PostgreSQL dependency healthy. | observed |
| Email delivery | Mailpit UI is unavailable, so a real email/password delivery journey is not demonstrated. | NOT VERIFIED |
| Social auth | The capability response advertises no configured Google or Apple provider. | not applicable for this observed runtime |
| Asset claim and checksum | No authenticated browser/session and private upload claim were performed. | NOT VERIFIED |
| Callback replay | No real callback/pending intent was submitted. | NOT VERIFIED |
| Authoritative quote | Generation is disabled, so no non-estimate quote identifier was available. | NOT VERIFIED |
| Durable accepted run | Render queue pause and worker heartbeat were not available; no submission was made. | NOT VERIFIED |
| Provider isolation | No provider marker, request, attempt, or cost was created. | observed |

## Command record

- `bun scripts/infra/run-phase3-provisioned-uat.ts` — intentionally exits non-zero after read-only readiness inspection when UAT prerequisites are missing; no mutation is attempted.
- `bun scripts/infra/run-phase3-provisioned-uat.ts --verify-evidence` — confirms this artifact explicitly records the blocked result without a false pass.

## Required follow-up

1. Start a disposable local stack with PostgreSQL, private storage, Mailpit, API, and worker heartbeat; enable authoritative pricing and one approved capability without enabling provider dispatch.
2. Pause the render-work queue and verify the pause while heartbeat remains fresh.
3. Use disposable accounts to complete email authentication, configured social flows if advertised, private claim checksum equality, wrong-account denial, callback replay, authoritative quote, and exactly one durable accepted run.
4. Release or cancel the untouched reservation before unpausing the queue; record only redacted counts and safe evidence.
5. Replace this status only after the real evidence and browser matrix both pass.
