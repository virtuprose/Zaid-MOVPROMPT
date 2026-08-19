---
phase: 2
slug: guest-authentication-and-data-integrity
status: evidence_partial
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-19
updated: 2026-08-19
---

# Phase 2 — Validation Strategy

> Execution-aligned contract for eight sequential plans covering durable claim, IndexedDB recovery, auth capability, private media, shared abuse controls, source truth, cleanup/isolation, and rendered UI proof.

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Vitest 4.1.10, Testing Library/jsdom, PostgreSQL 17 integration, pg-boss worker tests, restricted-role SQL, private storage integration, rendered browser QA |
| Config | Workspace test scripts; `apps/web/vitest.config.ts`; `scripts/infra/validate-phase2-migrations.sh`; `scripts/infra/check-rls-isolation.sql` |
| Focused task rule | Run only the test files and affected workspace typecheck named by each task |
| Full phase gate | `bun run test:all && bun run typecheck && bun run db:check`, guarded PostgreSQL 17 migration/RLS proof, worker cleanup suite, private-object checks, and rendered browser matrix |
| Browser proof | Available in-app browser or Chrome control; do not add `@playwright/test` in Phase 2 |

## Sampling Rate

- **After every task:** focused command in the corresponding PLAN task; no watch mode.
- **After each plan:** affected workspace tests/typecheck plus any plan-specific PostgreSQL/storage/worker gate.
- **Only at the final phase gate:** full workspace suite, guarded empty→latest migration/RLS harness and complete rendered matrix.
- **Evidence task:** quick web lint plus evidence-redaction script; it does not repeat the full phase suite.

## Per-Task Verification Map

| Task | Plan | Wave | Requirements | Primary proof | Focused command / artifact | Status |
|---|---:|---:|---|---|---|---|
| 02-01-01 | 01 | 1 | AUTH-07, AUTH-08, AUTH-10 | Route→service→repository→PostgreSQL asset-free tracer | `apps/api/src/guest-claim-service.postgres.test.ts` | ⬜ pending |
| 02-01-02 | 01 | 1 | AUTH-08, AUTH-10 | Claim tables/FKs/indexes/RLS plus safe empty→latest/rerun | `validate-phase2-migrations.sh` | ⬜ pending |
| 02-01-03 | 01 | 1 | AUTH-07, AUTH-08, AUTH-10 | Start/resume/finalize concurrency and preconditions | `guest-claim-service.postgres` | ⬜ pending |
| 02-02-01 | 02 | 2 | AUTH-01, AUTH-02, AUTH-06, AUTH-07 | Complete local campaign + stable intent; zero cloud before auth | `guestDraftStore guestClaimRecovery` | ⬜ pending |
| 02-02-02 | 02 | 2 | AUTH-07, AUTH-09 | Seven-day expiry, fail-closed receipt, one cleanup | `guestDraftStore guestClaimRecovery` | ⬜ pending |
| 02-03-01 | 03 | 3 | AUTH-02, AUTH-03, AUTH-04 | Shared auth capability and verification policy | `packages/auth config` + contracts | ⬜ pending |
| 02-03-02 | 03 | 3 | AUTH-03, AUTH-06, AUTH-07, AUTH-08 | Deterministic Google/Apple callback/claim/replay stubs | `auth-provider-stubs app` | ⬜ pending |
| 02-03-03 | 03 | 3 | AUTH-02, AUTH-05, AUTH-06 | Provider visibility and safe return priority | `authProviders returnPath` | ⬜ pending |
| 02-04-01 | 04 | 4 | AUTH-10, SOURCE-05, PROJ-06 | One private image, exact integrity, owner refresh | `apps/api assets` + storage | ⬜ pending |
| 02-04-02 | 04 | 4 | AUTH-07, AUTH-09, SOURCE-05, SOURCE-06 | Multi-asset partial failure/resume and local retention | `creatorAssets guestClaimRecovery` | ⬜ pending |
| 02-04-03 | 04 | 4 | AUTH-07, AUTH-10, SOURCE-05, PROJ-06 | Multi-asset server integrity, owner denial and replay | `apps/api assets` | ⬜ pending |
| 02-05-01 | 05 | 5 | SOURCE-04 | Atomic 20/10m scan quota and trusted-client identity | `request-rate-limiter source-scanner` + migration harness | ⬜ pending |
| 02-05-02 | 05 | 5 | SOURCE-04, SOURCE-05 | Shared SSRF/media policy and 50/10m mirror quota | `source-scanner remote-image-fetcher creator-routes` | ⬜ pending |
| 02-05-03 | 05 | 5 | SOURCE-04 | Runtime defaults/overrides/fail-closed composition | `request-rate-limiter creator-routes config` | ⬜ pending |
| 02-06-01 | 06 | 6 | AUTH-10, SOURCE-07 | Immutable source fingerprint/version and stale-output denial | `creator-routes.postgres source-change` | ⬜ pending |
| 02-06-02 | 06 | 6 | AUTH-07, SOURCE-06, SOURCE-07 | Recovery state and current-output truth | `guestClaimRecovery projectStore creatorProjectOutput` | ⬜ pending |
| 02-06-03 | 06 | 6 | AUTH-06, SOURCE-06 | Exact bilingual retry/replace/offline/session UI | `guestClaimRecovery creatorProjectOutput` | ⬜ pending |
| 02-07-01 | 07 | 7 | AUTH-09, AUTH-10, SOURCE-05 | 24h pg-boss cleanup, audit/retry/finalized immunity | `abandoned-claim-cleanup` | ⬜ pending |
| 02-07-02 | 07 | 7 | AUTH-10, PROJ-06 | Guarded PostgreSQL17 migration and restricted-role RLS | `validate-phase2-migrations.sh` | ⬜ pending |
| 02-07-03 | 07 | 7 | AUTH-08, AUTH-09, AUTH-10, SOURCE-05, PROJ-06 | Two-user HTTP/DB/storage/cleanup race matrix | API + worker + DB focused suites | ⬜ pending |
| 02-08-01 | 08 | 8 | AUTH-01, AUTH-02, AUTH-03, AUTH-04 | Generate/email UI, claim stages and full AuthCopy contract | `AuthGateDialog AuthCopy CreatorShell` | ✅ green — focused tests and web typecheck passed |
| 02-08-02 | 08 | 8 | AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, SOURCE-06 | Callback/reset/replay/recovery bilingual UI | `AuthCopy GuestAuthRecovery returnPath` | ✅ green — deterministic recovery seam and web typecheck passed |
| 02-08-03 | 08 | 8 | AUTH-01..10, SOURCE-04..07, PROJ-06 | Rendered responsive/RTL/theme/a11y plus redacted evidence | web lint + evidence redaction + browser matrix | ⚠️ partial — local rendered shell/auth matrix passed; live API/provider/claim routes were unavailable |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Artifacts Required by Plans

- [ ] `packages/contracts/src/guest-claims.ts`
- [ ] `apps/api/src/guest-claim-service.postgres.test.ts`
- [ ] `apps/web/src/features/create/guestDraftStore.test.ts`
- [ ] `apps/web/src/features/create/guestClaimRecovery.test.ts`
- [ ] `apps/api/src/auth-provider-stubs.test.ts` plus test-only provider stubs
- [ ] `apps/api/src/request-rate-limiter.test.ts`
- [ ] `apps/worker/src/abandoned-claim-cleanup.test.ts`
- [ ] `apps/web/src/features/create/GuestAuthRecovery.test.tsx`
- [ ] Extend concrete `apps/web/src/pages/AuthCopy.test.ts` for all complete English/Arabic strings
- [ ] `scripts/infra/validate-phase2-migrations.sh` and restricted `check-rls-isolation.sql`
- [ ] `02-BROWSER-EVIDENCE.md` plus evidence-redaction script

## Blocking Migration and Isolation Proof

The Phase 2 migration harness must:

1. Use PostgreSQL 17.
2. Generate only a unique database matching `movprompt_phase2_test_*`.
3. Reject database names or hosts indicating production, staging or development before any create/drop.
4. Apply repository SQL migrations empty→latest; never use `drizzle push`.
5. Assert Phase 2 tables, functions, FKs, checks, indexes and forced RLS.
6. Reapply migrations safely.
7. Run the restricted-role proof with `current_user`, `rolbypassrls=false`, `rolsuper=false`, and transaction-local `SET LOCAL movprompt.user_id` for two users.
8. Drop only the validated generated database under success/error trap.

Any failure blocks the next dependent plan.

## Rendered UI Matrix

Validate all approved default/loading/success/cancel/error/offline/mismatch/expiry/replay/reminder states at:

- 375, 768, 1024 and 1440 pixels.
- English/LTR and Arabic/RTL.
- Light and dark themes.
- Keyboard-only, screen-reader semantics, focus trap/restore, 44px targets and reduced motion.
- No horizontal overflow, clipped action, fake percentage/render progress, duplicate toast or hidden primary action.

`02-BROWSER-EVIDENCE.md` must omit passwords, cookies, OAuth state, tokens, signed URLs, raw remote URLs, object keys, secrets and other-user identifiers. Record request IDs, row/object counts and checksum agreement only.

## Validation Sign-Off

- [x] Every task-focused command passes.
- [ ] Guarded PostgreSQL 17 empty→latest/rerun/drop passes.
- [ ] Restricted-role RLS and two-user matrix pass.
- [ ] 24-hour cleanup/audit/retry/finalized-immunity pass.
- [ ] Full phase suite passes once at the phase gate (root DB/API/worker harness intentionally not rerun in this browser-only evidence task).
- [ ] Rendered UI matrix and redaction pass (redaction passes; live provider/claim/browser paths remain open because the local API/worker/storage stack was unavailable).
- [ ] No new browser-test dependency appears.
- [ ] `nyquist_compliant: true` is set only after all evidence is green.

**Approval:** partial — web suite, typecheck, build, lint, and redaction passed. See `02-BROWSER-EVIDENCE.md` for the rendered matrix and the explicitly open live-stack checks.
