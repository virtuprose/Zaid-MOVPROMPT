---
phase: 03
slug: product-and-service-golden-paths
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-20
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for the complete beginner product and service campaign journeys.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10, Testing Library, jsdom, existing API/contract integration suites |
| **Config file** | `apps/web/vitest.config.ts` plus workspace-local Vitest configurations |
| **Quick run command** | `bun run --cwd apps/web test -- src/features/create/<target>.test.tsx` |
| **Full suite command** | `bun run test:all && bun run typecheck && bun run build && bun run check:web-bundle` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run the focused Vitest file(s) named by that task plus affected workspace typecheck.
- **After every plan wave:** Run `bun run test:all && bun run typecheck`.
- **Before `$gsd-verify-work`:** Run the full suite, production build, bundle gate, and rendered-browser matrix.
- **Max feedback latency:** 180 seconds for automated task feedback.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | SOURCE-01, SOURCE-02 | T-03-01 | Manual product uses the shared source/fact anchor. | unit/contracts | `bun run --cwd apps/web test -- src/features/create/campaignFacts.test.ts -t "manual product tracer" && bun run --cwd packages/contracts test -- creator` | ✅ | ✅ green |
| 03-01-02 | 01 | 1 | SOURCE-01, SOURCE-02, SOURCE-03 | T-03-01, T-03-02 | Every source kind retains fact provenance and stable media identity. | unit/contracts | `bun run --cwd apps/web test -- src/features/create/campaignFacts.test.ts && bun run --cwd packages/contracts test -- creator` | ✅ | ✅ green |
| 03-01-03 | 01 | 1 | CREATE-02, CREATE-03 | T-03-03 | Source-first/template-first serialize identical normalized intent. | unit/contracts | `bun run --cwd apps/web test -- src/features/create/campaignDraft.test.ts && bun run --cwd packages/creative-engine test -- types` | ✅ | ✅ green |
| 03-02-01 | 02 | 2 | SOURCE-01, SOURCE-02, SOURCE-03, CREATE-01 | T-03-01, T-03-02 | Product link reaches provenance-aware review. | component | `bun run --cwd apps/web test -- src/features/create/GoldenPathFlow.test.tsx -t "product link to confirmed facts"` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | SOURCE-01, SOURCE-02, SOURCE-03 | T-03-02 | Service/manual/upload/footage share exact fact review. | component | `bun run --cwd apps/web test -- src/features/create/FactReviewStep.test.tsx` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | CREATE-10 | T-03-08 | Bilingual source errors preserve the draft. | component | `bun run --cwd apps/web test -- src/features/create/GoldenPathStates.test.tsx src/features/create/FactReviewStep.test.tsx` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | CREATE-04, CREATE-05 | T-03-04, T-03-05 | Eligible catalog data receives an exact server quote; catalog never prices. | API/contracts | `bun run --cwd apps/api test -- generation-service.test.ts -t "template quote eligibility" && bun run --cwd packages/contracts test -- contracts` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 3 | CREATE-05, CREATE-10 | T-03-04, T-03-05 | Ineligible/stale/changed quotes fail before reservation. | API | `bun run --cwd apps/api test -- generation-service.test.ts -t "template quote rejection"` | ❌ W0 | ⬜ pending |
| 03-03-03 | 03 | 3 | CREATE-05, CREATE-10 | T-03-05 | Browser quote state is configuration-keyed and has no fallback price. | unit | `bun run --cwd apps/web test -- src/features/create/templateQuoteState.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 4 | SOURCE-03, CREATE-07 | T-03-06, T-03-11 | Footage/presenter/rights contracts reject Digital Twin and invalid media. | contracts/migration | `bun run --cwd packages/contracts test -- contracts && bun run --cwd packages/db check` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 4 | CREATE-07, CREATE-10 | T-03-06, T-03-11 | Guest claim rejects unsupported/mismatched presenter media and rights. | PostgreSQL integration | `bun run --cwd apps/api test -- guest-claim-service.postgres.test.ts -t "presenter eligibility"` | ❌ W0 | ⬜ pending |
| 03-04-03 | 04 | 4 | CREATE-05, CREATE-07, CREATE-09, CREATE-10 | T-03-06, T-03-11, T-03-12 | Quote/start reject unsupported or cross-user presenter configuration. | API/service | `bun run --cwd apps/api test -- generation-service.test.ts generation.test.ts -t "presenter eligibility"` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 5 | CREATE-02, CREATE-03, CREATE-04, CREATE-05 | T-03-05 | One outcome produces one explainable selectable quoted template. | component/unit | `bun run --cwd apps/web test -- src/features/create/templateRecommendations.test.ts src/features/create/TemplateRecommendation.test.tsx -t "quoted recommendation tracer"` | ❌ W0 | ⬜ pending |
| 03-05-02 | 05 | 5 | CREATE-04, CREATE-05, CREATE-10 | T-03-05, T-03-14 | All recommendations disclose eligibility and quote recovery honestly. | component/unit | `bun run --cwd apps/web test -- src/features/create/TemplateRecommendation.test.tsx src/features/create/templateRecommendations.test.ts` | ❌ W0 | ⬜ pending |
| 03-05-03 | 05 | 5 | CREATE-06 | T-03-13 | Only verified motion is playable. | component | `bun run --cwd apps/web test -- src/features/create/TemplateRecommendation.test.tsx src/features/create/TemplateGrid.test.tsx` | ❌ W0 | ⬜ pending |
| 03-06-01 | 06 | 6 | CREATE-07, CREATE-08, CREATE-10 | T-03-07, T-03-11 | No-presenter Kuwait setup persists and invalidates stale quote. | component | `bun run --cwd apps/web test -- src/features/create/CampaignSetupStep.test.tsx -t "no presenter Kuwait setup"` | ❌ W0 | ⬜ pending |
| 03-06-02 | 06 | 6 | SOURCE-03, CREATE-07 | T-03-11, T-03-15 | UI renders only server-supported presenter choices and exact footage rights. | component | `bun run --cwd apps/web test -- src/features/create/PresenterStep.test.tsx` | ❌ W0 | ⬜ pending |
| 03-06-03 | 06 | 6 | CREATE-08, CREATE-10 | T-03-07 | Bilingual Kuwait settings persist and reprice losslessly. | component | `bun run --cwd apps/web test -- src/features/create/CampaignSetupStep.test.tsx src/features/create/PresenterStep.test.tsx` | ❌ W0 | ⬜ pending |
| 03-07-01 | 07 | 7 | CREATE-09, CREATE-10 | T-03-03, T-03-05 | Product review and pending auth use exact canonical data/current quote. | component | `bun run --cwd apps/web test -- src/features/create/CampaignReviewStep.test.tsx -t "exact product review"` | ❌ W0 | ⬜ pending |
| 03-07-02 | 07 | 7 | SOURCE-02, SOURCE-03, CREATE-09, CREATE-10 | T-03-03, T-03-05 | Arabic service review remains exact and RTL-safe. | component | `bun run --cwd apps/web test -- src/features/create/CampaignReviewStep.test.tsx -t "Arabic service review"` | ❌ W0 | ⬜ pending |
| 03-07-03 | 07 | 7 | CREATE-10 | T-03-05, T-03-08 | Quote/auth/service recovery retains one pending intent. | component | `bun run --cwd apps/web test -- src/features/create/GoldenPathStates.test.tsx src/features/create/AuthGateDialog.test.tsx src/features/create/CampaignReviewStep.test.tsx` | ❌ W0 | ⬜ pending |
| 03-08-01 | 08 | 8 | SOURCE-01..03, CREATE-01..10 | T-03-01..17 | Focused creator smoke proves both configurations without provider work. | integration | `bun run test:creator-smoke && bun run typecheck:web` | ❌ W0 | ⬜ pending |
| 03-08-02 | 08 | 8 | SOURCE-01..03, CREATE-01..10 | T-03-06, T-03-08, T-03-09, T-03-16, T-03-17 | Provisioned stack proves real auth/claim/checksum/replay/quote/durable submission and zero provider cost. | provisioned UAT | `bun run test:creator-smoke && bun scripts/infra/run-phase3-provisioned-uat.ts --verify-evidence && node scripts/infra/check-phase3-evidence-redaction.mjs` | ❌ W0 | ⬜ pending |
| 03-08-03 | 08 | 8 | SOURCE-01..03, CREATE-01..10 | T-03-01..17 | Full rendered and release matrix follows focused smoke and requires UAT PASS. | browser/build | `bun run test:creator-smoke && bun run test:all && bun run typecheck && bun run build && bun run check:web-bundle && node scripts/infra/check-phase3-evidence-redaction.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `packages/contracts/src/creator.test.ts` — normalized CampaignSource variants and unsafe-input rejection.
- [x] `apps/web/src/features/create/campaignFacts.test.ts` — provenance transitions and normalized product/service fact validation.
- [x] `apps/web/src/features/create/campaignDraft.test.ts` — source-first/template-first convergence and guest/auth/project-version round trip.
- [ ] `apps/api/src/generation-service.test.ts` and `generation.test.ts` — catalog eligibility, configuration-bound quotes, expiry/change and presenter negative API cases.
- [ ] `apps/api/src/guest-claim-service.postgres.test.ts` — guest presenter manifest, rights, replay and private footage claim cases.
- [ ] `apps/web/src/features/create/templateQuoteState.test.ts` — idle/loading/ready/unavailable/expired/changed quote lifecycle with no fallback price.
- [ ] `apps/web/src/features/create/GoldenPathFlow.test.tsx` and `GoldenPathStates.test.tsx` — beginner journeys plus loading, invalid, offline, capability, quote, auth, and recovery states.
- [ ] `apps/web/src/features/create/FactReviewStep.test.tsx`, `templateRecommendations.test.ts`, `TemplateRecommendation.test.tsx`, `PresenterStep.test.tsx`, `CampaignSetupStep.test.tsx`, and `CampaignReviewStep.test.tsx` — focused component and rule coverage.
- [ ] `apps/web/src/features/create/__fixtures__/goldenPathFixtures.ts` — approved product and service fixtures containing expected facts, provenance, rights state, outcome, and CTA.
- [ ] Root `test:creator-smoke` script — focused golden path/contract/state gate executed before the broad suite.
- [ ] `scripts/infra/run-phase3-provisioned-uat.ts`, `scripts/infra/check-phase3-evidence-redaction.mjs`, `03-UAT-EVIDENCE.md`, and `03-BROWSER-EVIDENCE.md` — real-stack proof, evidence redaction and the complete rendered matrix.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Provisioned product/service UAT proves real email auth, configured social auth where available, private claim/checksum, callback replay, authoritative quote and one durable accepted run with provider queue paused. | SOURCE-01..03, CREATE-01..10 | Requires a healthy disposable PostgreSQL/private-storage/Mailpit/API/worker/web stack and browser session. | Run Task 03-08-02 exactly; verify one project/version/run, checksum equality, cross-user denial, replay idempotency, non-estimate quoteId, paused render queue and no provider marker/attempt/cost. Phase 03 remains incomplete if this row is not PASS. |
| Responsive and accessible completion across the required matrix. | CREATE-01, CREATE-05..10 | Visual hierarchy, focus order, RTL, motion, and screen-reader announcements require rendered inspection. | Complete both paths at 375, 768, 1024, and 1440 pixels in English/Arabic and light/dark; verify keyboard-only flow, 44px targets, visible focus, no overflow, reduced motion, and polite status announcements. |

---

## Validation Sign-Off

- [ ] All tasks have focused automated verification or a Wave 0 dependency.
- [ ] Sampling continuity: no three consecutive tasks lack an automated check.
- [ ] Wave 0 covers every missing test reference.
- [ ] No watch-mode flags are used in verification commands.
- [ ] Feedback latency remains below 180 seconds.
- [ ] The approved product and service fixture packs are recorded before browser UAT.
- [ ] Task 03-08-02 has PASS evidence; a missing/unavailable provisioned environment keeps Phase 03 formally incomplete.
- [ ] `bun run test:creator-smoke` passes before the broad test/typecheck/build/bundle gate.
- [ ] `nyquist_compliant: true` is set only after all automated and manual gates pass.

**Approval:** pending
