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
| 03-01-01 | 01 | 1 | SOURCE-01, SOURCE-02 | T-03-01 | Every source kind normalizes into typed facts without losing source-specific values. | unit | `bun run --cwd apps/web test -- src/features/create/campaignFacts.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | SOURCE-03 | T-03-02 | Imported edits become user-entered facts; confirmation changes only eligible facts. | unit | `bun run --cwd apps/web test -- src/features/create/campaignFacts.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | CREATE-02, CREATE-03 | T-03-03 | Source-first and template-first paths serialize to the same validated configuration. | unit/contracts | `bun run --cwd apps/web test -- src/features/create/campaignDraft.test.ts && bun run --cwd packages/contracts test -- creator` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | SOURCE-01, CREATE-01 | T-03-01 | The beginner source step exposes truthful entry methods without provider or editor jargon. | component | `bun run --cwd apps/web test -- src/features/create/GoldenPathFlow.test.tsx -t beginner` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | SOURCE-02, SOURCE-03 | T-03-02 | Fact review identifies provenance, validates required facts, and retains edits. | component | `bun run --cwd apps/web test -- src/features/create/FactReviewStep.test.tsx` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | CREATE-03, CREATE-04 | T-03-04 | Outcome selection produces deterministic, explainable recommendations and an honest fallback. | unit/component | `bun run --cwd apps/web test -- src/features/create/recommendationEngine.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 3 | CREATE-05, CREATE-06 | T-03-05 | Cards disclose requirements, formats, presenter/quote state, and only verified motion is playable. | component | `bun run --cwd apps/web test -- src/features/create/TemplateRecommendation.test.tsx src/features/create/TemplateGrid.test.tsx` | ❌ / ✅ baseline | ⬜ pending |
| 03-04-01 | 04 | 4 | CREATE-07 | T-03-06 | Presenter choices fail closed; spokesperson media requires an explicit rights attestation. | component/unit | `bun run --cwd apps/web test -- src/features/create/PresenterStep.test.tsx` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 4 | CREATE-08 | T-03-07 | Kuwait/KWD, language, CTA, price, offer, ratios, quality, subtitles, and audio round-trip unchanged. | component | `bun run --cwd apps/web test -- src/features/create/CampaignSetupStep.test.tsx` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 5 | CREATE-09 | T-03-02 / T-03-03 | Final review shows every used fact and routes each Edit action to the correct step. | component/contract | `bun run --cwd apps/web test -- src/features/create/CampaignReviewStep.test.tsx src/features/create/__tests__/creatorContracts.test.ts` | ❌ / ✅ baseline | ⬜ pending |
| 03-05-02 | 05 | 5 | CREATE-10 | T-03-08 | Loading, invalid, offline, unavailable, and recovery states retain the draft and expose one honest next action. | component | `bun run --cwd apps/web test -- src/features/create/GoldenPathStates.test.tsx` | ❌ W0 | ⬜ pending |
| 03-06-01 | 06 | 6 | SOURCE-01..03, CREATE-01..10 | T-03-01..08 | Product and service fixtures complete the same guest-to-review journey without cross-account, signed-URL, or fact leakage. | integration/browser | `bun run test:all && bun run typecheck && bun run build && bun run check:web-bundle` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/src/features/create/campaignFacts.test.ts` — provenance transitions and normalized product/service fact validation.
- [ ] `apps/web/src/features/create/campaignDraft.test.ts` — source-first/template-first convergence and guest/auth/project-version round trip.
- [ ] `apps/web/src/features/create/GoldenPathFlow.test.tsx` — beginner terminology and both source journeys.
- [ ] `apps/web/src/features/create/GoldenPathStates.test.tsx` — loading, empty, invalid, offline, capability, quote, and recovery states.
- [ ] Component tests for fact review, recommendations, presenter selection, campaign setup, and final review.
- [ ] Approved product and service fixture manifest containing expected facts, provenance, rights state, outcome, and CTA.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Product golden path preserves the approved real fixture through Generate-time auth and draft recovery. | SOURCE-01..03, CREATE-02, CREATE-08..10 | Requires the provisioned portable stack, a real authenticated session, and private object storage. | Use the approved product fixture; complete source review, outcome, template, presenter, setup, review, auth return, and recovery; compare every displayed and stored value. |
| Service-business golden path preserves booking/WhatsApp fields through the same path. | SOURCE-01..03, CREATE-02..10 | Requires a safe real service fixture and rendered browser evidence. | Use the approved service fixture and verify business name, service description, location, booking/WhatsApp destination, offer, language, presenter, and rights state. |
| Responsive and accessible completion across the required matrix. | CREATE-01, CREATE-05..10 | Visual hierarchy, focus order, RTL, motion, and screen-reader announcements require rendered inspection. | Complete both paths at 375, 768, 1024, and 1440 pixels in English/Arabic and light/dark; verify keyboard-only flow, 44px targets, visible focus, no overflow, reduced motion, and polite status announcements. |

---

## Validation Sign-Off

- [ ] All tasks have focused automated verification or a Wave 0 dependency.
- [ ] Sampling continuity: no three consecutive tasks lack an automated check.
- [ ] Wave 0 covers every missing test reference.
- [ ] No watch-mode flags are used in verification commands.
- [ ] Feedback latency remains below 180 seconds.
- [ ] The approved product and service fixture packs are recorded before browser UAT.
- [ ] `nyquist_compliant: true` is set only after all automated and manual gates pass.

**Approval:** pending
