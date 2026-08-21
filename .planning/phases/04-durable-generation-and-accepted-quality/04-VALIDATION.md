---
phase: 04
slug: durable-generation-and-accepted-quality
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-21
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 plus disposable PostgreSQL 17 and real FFmpeg/FFprobe fixtures |
| **Config file** | `apps/worker/vitest.config.ts`, `apps/api/vitest.config.ts`, and workspace equivalents |
| **Quick run command** | `bun run --cwd apps/worker test --run src/render-lifecycle.test.ts src/output-persister.test.ts src/output-quality-reviewer.test.ts src/media-quality-analyzers.test.ts` |
| **Full suite command** | `bun run test:all && bun run typecheck && bun run build:all` plus the Phase 04 disposable-PostgreSQL suite |
| **Estimated runtime** | ~60 seconds without external provider calls |

---

## Sampling Rate

- **After every task commit:** Run the affected focused Vitest files; never call a paid provider from an automated test.
- **After every plan wave:** Run the worker/provider/API focused suite and relevant disposable-PostgreSQL integration tests.
- **Before `$gsd-verify-work`:** Full suite, full typecheck/build, media fixtures, PostgreSQL concurrency proof, browser evidence, and one separately authorized real canary must be green.
- **Max feedback latency:** 120 seconds for automated non-provider gates.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | GEN-05 | T-04-01 | Same persisted provider operation resumes; uncertainty never resubmits | worker unit/integration | `bun run --cwd apps/worker test --run src/render-lifecycle.test.ts` | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | GEN-06, GEN-07 | T-04-02 | Output is allowlisted, bounded, private-stored, normalized and fully decoded before completion | worker media fixture | `bun run --cwd apps/worker test --run src/output-persister.test.ts src/media-quality-analyzers.test.ts` | ✅ | ⬜ pending |
| 04-01-03 | 01 | 1 | GEN-12, GEN-14 | T-04-03 | Cancellation and public errors never fabricate provider state or leak internals | API/provider unit | `bun run --cwd apps/api test --run src/generation.test.ts src/generation-service.test.ts && bun run --cwd packages/providers test --run src/vercel-gateway-seedance.test.ts` | ✅ | ⬜ pending |
| 04-02-01 | 02 | 2 | GEN-08 | T-04-04 | Complete structured technical and business-quality evidence is required | worker fixture | `bun run --cwd apps/worker test --run src/output-quality-reviewer.test.ts src/media-quality-analyzers.test.ts` | ✅ | ⬜ pending |
| 04-02-02 | 02 | 2 | GEN-09 | T-04-05 | Initial attempt plus at most two internal retries settle as one customer result | worker + PostgreSQL | `bun run --cwd apps/worker test --run src/render-lifecycle.test.ts` | ✅ | ⬜ pending |
| 04-03-01 | 03 | 3 | GEN-10, GEN-11 | T-04-06 | Concurrent terminal paths settle once and preserve the prior accepted version | PostgreSQL integration | `bun run --cwd packages/db test --run test/generation-service.postgres.test.ts` | ✅ | ⬜ pending |
| 04-03-02 | 03 | 3 | GEN-13, GEN-14 | T-04-07 | Only the owner receives a refreshed short-lived accepted-output URL; public DTOs stay redacted | API/storage/browser | Phase 04 output-refresh API test plus browser evidence script | ❌ W0 | ⬜ pending |
| 04-03-03 | 03 | 3 | GEN-05–GEN-14 | T-04-08 | One explicitly authorized canary proves same-operation recovery, private accepted media, quality and settlement | controlled canary | Manual canary checklist; no automated paid command | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Add a deterministic fixture proving full decode/probe of the final normalized private object.
- [ ] Add a disposable-PostgreSQL race test for reconciliation, retry and cancellation with one provider operation and one settlement.
- [ ] Add public-response and structured-log redaction assertions for provider IDs, raw errors, signed URLs and retry internals.
- [ ] Add browser evidence for accepted-output URL refresh after expiry and honest pending-cancellation copy.
- [ ] Create a paid-canary checklist that requires current budget authorization and records operation, host, cost, private checksum, media/quality decision and ledger outcome.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Seedance 2.5 operation survives browser closure and worker restart, then stores and accepts the same operation | GEN-05–GEN-09 | Requires an external billable provider operation and observed output host | Obtain explicit current budget approval; follow `docs/runbooks/GENERATION_ACTIVATION.md`; record only sanitized evidence; do not resubmit when output acquisition needs reconciliation |
| User sees persisted progress, pending cancellation, accepted playback/download, and refreshed expired URL | GEN-11–GEN-14 | Requires rendered browser and provisioned stack evidence | Exercise at 375/768/1024/1440 in English/Arabic and light/dark; verify clean console, focus, announcements, truthful copy, and owner-only download |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Automated feedback latency target is under 120 seconds
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
