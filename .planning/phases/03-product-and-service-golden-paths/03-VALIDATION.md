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
| 03-01-01 | 01 | 1 | SOURCE-01, SOURCE-02 | T-03-01 | A manual product source becomes the shared CampaignSource and ConfirmedFact collection with typed provenance. | unit/contracts | `bun run --cwd packages/contracts test -- contracts && bun run --cwd apps/web test -- src/features/create/campaignFacts.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | SOURCE-01, SOURCE-02, SOURCE-03 | T-03-01, T-03-02 | Every source variant retains source-specific media and fact provenance without inventing fields. | unit/contracts | `bun run --cwd packages/contracts test -- contracts && bun run --cwd apps/web test -- src/features/create/campaignFacts.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | CREATE-02, CREATE-03 | T-03-03 | Source-first and template-first paths serialize to the same validated campaign configuration. | unit/contracts | `bun run --cwd apps/web test -- src/features/create/campaignDraft.test.ts && bun run --cwd packages/contracts test -- creator` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | SOURCE-01, SOURCE-02, SOURCE-03, CREATE-01 | T-03-01, T-03-02 | Product-link import leads to a provenance-aware beginner fact review with one clear next action. | component | `bun run --cwd apps/web test -- src/features/create/GoldenPathFlow.test.tsx -t product-link` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | SOURCE-01, SOURCE-02, SOURCE-03 | T-03-02 | Service, manual, upload, and footage sources use the same review contract and validate required facts and rights. | component | `bun run --cwd apps/web test -- src/features/create/FactReviewStep.test.tsx` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | CREATE-10 | T-03-08 | English, Arabic, and bilingual source validation/recovery states keep the draft intact. | component | `bun run --cwd apps/web test -- src/features/create/GoldenPathStates.test.tsx -t source` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | CREATE-02, CREATE-03, CREATE-04, CREATE-10 | T-03-04 | Outcome selection produces deterministic, explainable recommendations and an honest fallback. | unit/component | `bun run --cwd apps/web test -- src/features/create/templateRecommendations.test.ts src/features/create/TemplateRecommendation.test.tsx -t outcome` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 3 | CREATE-05 | T-03-05 | Eligibility comes from published template capabilities and declared inputs rather than card-label inference. | unit/component | `bun run --cwd apps/web test -- src/features/create/templateRecommendations.test.ts src/features/create/TemplateRecommendation.test.tsx -t eligibility` | ❌ W0 | ⬜ pending |
| 03-03-03 | 03 | 3 | CREATE-06 | T-03-05 | Only verified motion media is playable; unavailable motion is presented truthfully as a static direction. | component | `bun run --cwd apps/web test -- src/features/create/TemplateRecommendation.test.tsx -t preview` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 4 | CREATE-07, CREATE-08 | T-03-06, T-03-07 | No presenter remains the default and Kuwait campaign settings round-trip without hidden model concepts. | component | `bun run --cwd apps/web test -- src/features/create/PresenterStep.test.tsx src/features/create/CampaignSetupStep.test.tsx -t baseline` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 4 | CREATE-07 | T-03-06 | AI UGC is capability-gated and uploaded spokesperson use requires verified media plus explicit rights. | component/unit | `bun run --cwd apps/web test -- src/features/create/PresenterStep.test.tsx` | ❌ W0 | ⬜ pending |
| 03-04-03 | 04 | 4 | CREATE-08, CREATE-10 | T-03-07, T-03-08 | Progressive bilingual settings preserve language, CTA, price, offer, ratios, quality, subtitles, and audio. | component | `bun run --cwd apps/web test -- src/features/create/CampaignSetupStep.test.tsx` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 5 | CREATE-09 | T-03-02, T-03-03 | Product final review renders every exact fact and routes Edit actions to the correct step without data loss. | component/contract | `bun run --cwd apps/web test -- src/features/create/CampaignReviewStep.test.tsx src/features/create/__tests__/creatorContracts.test.ts -t product` | ❌ W0 | ⬜ pending |
| 03-05-02 | 05 | 5 | SOURCE-02, SOURCE-03, CREATE-09 | T-03-02, T-03-03 | Arabic service review preserves location, booking/WhatsApp, offer, provenance, media, presenter, and rights. | component/contract | `bun run --cwd apps/web test -- src/features/create/CampaignReviewStep.test.tsx src/features/create/__tests__/creatorContracts.test.ts -t service` | ❌ W0 | ⬜ pending |
| 03-05-03 | 05 | 5 | CREATE-10 | T-03-07, T-03-08 | Quote outages and Generate-time authentication retain the exact draft and expose one honest next action. | component | `bun run --cwd apps/web test -- src/features/create/GoldenPathStates.test.tsx src/features/create/GoldenPathFlow.test.tsx -t recovery` | ❌ W0 | ⬜ pending |
| 03-06-01 | 06 | 6 | SOURCE-01..03, CREATE-01..10 | T-03-01..08 | Product and service fixtures reach submission preflight through internal API seams without paid provider calls or cross-account leakage. | integration | `bun run --cwd apps/web test -- src/features/create/GoldenPathFlow.test.tsx src/features/create/GoldenPathStates.test.tsx src/features/create/__tests__/creatorContracts.test.ts && bun run --cwd apps/web typecheck` | ❌ W0 | ⬜ pending |
| 03-06-02 | 06 | 6 | SOURCE-01..03, CREATE-01..10 | T-03-01..08 | The full browser matrix is accessible, RTL-correct, truthful, redacted, and backed by the complete automated suite. | browser/build | `bun run test:all && bun run typecheck && bun run build && bun run check:web-bundle && node scripts/infra/check-phase3-evidence-redaction.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/contracts/src/contracts.test.ts` — normalized CampaignSource variants, ConfirmedFact provenance, and unsafe-input rejection.
- [ ] `apps/web/src/features/create/campaignFacts.test.ts` — provenance transitions and normalized product/service fact validation.
- [ ] `apps/web/src/features/create/campaignDraft.test.ts` — source-first/template-first convergence and guest/auth/project-version round trip.
- [ ] `apps/web/src/features/create/GoldenPathFlow.test.tsx` and `GoldenPathStates.test.tsx` — beginner journeys plus loading, invalid, offline, capability, quote, auth, and recovery states.
- [ ] `apps/web/src/features/create/FactReviewStep.test.tsx`, `templateRecommendations.test.ts`, `TemplateRecommendation.test.tsx`, `PresenterStep.test.tsx`, `CampaignSetupStep.test.tsx`, and `CampaignReviewStep.test.tsx` — focused component and rule coverage.
- [ ] `apps/web/src/features/create/__fixtures__/goldenPathFixtures.ts` — approved product and service fixtures containing expected facts, provenance, rights state, outcome, and CTA.
- [ ] `scripts/infra/check-phase3-evidence-redaction.mjs` and `03-BROWSER-EVIDENCE.md` — evidence-secret redaction and the required responsive, locale, theme, keyboard, focus, RTL, and reduced-motion matrix.

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
