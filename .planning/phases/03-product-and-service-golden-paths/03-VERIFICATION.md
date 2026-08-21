---
phase: 03-product-and-service-golden-paths
verified: 2026-08-21T14:48:00+03:00
status: human_needed
score: 3/5 must-haves verified
behavior_unverified: 2
overrides_applied: 0
behavior_unverified_items:
  - truth: "A user can complete the real product golden path through Generate-time authentication, private claim, authoritative quote, and one durable submission."
    test: "Run the product link/upload journey on a provisioned disposable stack with provider dispatch paused, close and reopen the browser, and inspect the single project/version/run."
    expected: "The exact confirmed campaign survives authentication, assets remain private and checksum-identical, the quote is authoritative, and replay creates no duplicate project, run, reservation, or charge."
    why_human: "The API, worker, private storage, and email service are not currently provisioned together; the read-only UAT harness failed at API readiness before any mutation."
  - truth: "A salon, clinic, or service user can complete the same real golden path with booking or WhatsApp facts preserved."
    test: "Run one manual or business-link service campaign through authentication, claim, quote, queue-paused submit, reload, and project recovery."
    expected: "Business facts, booking or WhatsApp destination, language, CTA, offer, delivery settings, rights, and pending intent remain exact and one durable run exists."
    why_human: "Deterministic browser/API/PostgreSQL tests cover the contracts, but the provisioned end-to-end service transition has not been observed."
human_verification:
  - test: "Provision PostgreSQL, private storage, Mailpit, API, and a fresh worker heartbeat, then pause the render-work queue."
    expected: "Feature readiness exposes authentication, assets, and authoritative generation pricing while provider work remains impossible during UAT."
    why_human: "The current local runtime has only the web application listening; the provisioned UAT cannot safely begin."
  - test: "Complete both the product and service Generate-time journeys with disposable accounts, including one cancelled auth return and one callback replay."
    expected: "Each exact draft returns, private checksums match, replay is idempotent, and each journey creates exactly one durable queued run without a provider attempt."
    why_human: "This behavior crosses browser, email/auth, API, PostgreSQL, object storage, and worker processes and must be observed on the assembled stack."
---

# Phase 3: Product and Service Golden Paths — Verification Report

**Phase Goal:** Make the beginner journey complete for one physical product and one service business with all campaign facts preserved.  
**Verified:** 2026-08-21  
**Status:** HUMAN VERIFICATION REQUIRED  
**Re-verification:** No — initial goal-backward verification after three adversarial code-review rounds, security closure, Nyquist audit, and UI remediation.

## Goal Achievement

### Observable Truths

| # | Roadmap truth | Status | Evidence |
|---|---|---|---|
| 1 | A real product link/photo user completes source review, outcome, template, campaign, review, auth, and submission without prompts or model choices. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Source selection, provenance review, recommendations, campaign setup, exact review, auth handoff, claim, quote, and start are implemented and tested. The assembled auth/storage/API/worker transition was not available for a real queue-paused submission. |
| 2 | A salon/clinic/service user completes the same guided journey with booking or WhatsApp outcomes. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Business link/manual sources, service facts, booking-vs-WhatsApp validation, clinic template restrictions, Arabic review, and service fixtures pass focused/API/security tests. The real provisioned service submission was not observed. |
| 3 | Final review and submitted configuration preserve every confirmed fact and delivery field exactly. | ✓ VERIFIED | Shared strict Template Campaign schemas bind source facts, media identities, campaign language, CTA, price, offer, destination, presenter policy, audio, subtitles, resolution, ratio, template version, and rights across browser, claim, version, quote, and start. Adversarial HTTP/PostgreSQL tests prove malformed or hidden fields create no project, quote, reservation, or render. |
| 4 | Template-first and source-first converge on one draft and launch options truthfully state inputs, preview type, duration, format, and quote. | ✓ VERIFIED | Campaign draft convergence tests, published template policy, deterministic recommendation scoring, configuration-bound quote states, and verified-motion/static-direction separation are wired and green. |
| 5 | Every screen has one clear task/action and complete responsive, bilingual, theme, error, and accessibility states. | ✓ VERIFIED | The web suite passes 201 tests. The rendered 16-case EN/AR × light/dark × 375/768/1024/1440 matrix passed with no overflow, 44px visible controls, keyboard/error association, reduced motion, clean console, and Axe WCAG 2 A/AA zero violations. |

**Score:** 3/5 truths verified; 2 are substantive and wired but require provisioned cross-process behavior evidence.

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/contracts/src/creator.ts` | One strict product/service/campaign boundary | ✓ VERIFIED | Normalized source facts, presenter policy, Template Campaign payload, bounded values, and cross-field equality checks are exported and used by web/API. |
| `apps/web/src/features/create/CreateStudio.tsx` | One guided beginner orchestrator | ✓ VERIFIED | Composes source, fact, campaign, recommendation, review, auth, claim, authoritative quote, and submission paths without exposing providers/models. |
| `apps/web/src/features/create/SourceChoiceStep.tsx` and `FactReviewStep.tsx` | Product/service/upload/footage/manual start plus provenance review | ✓ VERIFIED | All declared source starts are behaviorally covered; invalid source recovery is associated and bilingual. |
| `apps/web/src/features/create/TemplateRecommendationCards.tsx` | Outcome-led truthful recommendations | ✓ VERIFIED | Maximum-three deterministic recommendations, quote gating, eligibility explanations, and motion/static truth are wired. |
| `apps/web/src/features/create/CampaignSetupStep.tsx` and `CampaignReviewStep.tsx` | Kuwait settings and exact final review | ✓ VERIFIED | KWD, CTA/destination, offer, language, media/delivery, rights, and quote states render and persist with direction-safe Arabic values. |
| `apps/api/src/guest-claim-service.ts` and `creator-repository.ts` | Strict owner-scoped claim and immutable persistence | ✓ VERIFIED | Full snapshot parsing occurs before eligibility and again before transactional persistence/finalization. |
| `apps/api/src/generation-service.ts` | Persisted Template validation before quote/start | ✓ VERIFIED | Reloads immutable template policy, revalidates stored payload, verifies owned references, binds quote/hash, and rejects mismatches before economic/provider work. |
| `scripts/infra/run-phase3-provisioned-uat.ts` | Safe real-stack UAT gate | ⚠️ PRESENT, ENVIRONMENT UNAVAILABLE | Correctly fails closed and performs no mutation/provider work, but the required local services are not assembled. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Source choice | Confirmed campaign facts | `CampaignSource` plus provenance transitions | ✓ WIRED | Product, business/service, upload, footage, and manual entries converge on one normalized anchor. |
| Template-first/source-first | One creation draft | `campaignDraft` serialization and stable template version | ✓ WIRED | Tests prove both entry directions retain the same normalized intent. |
| Campaign setup/review | Guest claim snapshot | Strict Template Campaign payload | ✓ WIRED | User-visible values and hidden delivery values must match across project, recipe, and generation configuration. |
| Guest claim | Private owned assets | Checkpointed asset manifest, checksum, owner/project predicates | ✓ WIRED | Signed URLs are not authority; unsafe/spoofed media fails full decode before persistence or use. |
| Project version | Quote/start | Immutable template reload plus configuration hash | ✓ WIRED | Changed fields invalidate the quote; malformed persisted rows cannot reach reservation/provider work. |
| Auth return | Pending generation | Stable draft and pending intent | ✓ WIRED, LIVE UAT OPEN | Unit/integration tests cover cancellation and replay; the real multi-process handoff remains unobserved. |

## Data-Flow Trace

| Data | Source | Destination | Status |
|---|---|---|---|
| Product/service facts and provenance | Imported or manually confirmed `CampaignSource` | Final review, immutable project version, quote binding | ✓ FLOWING |
| Campaign language, CTA, destination, price, offer | Campaign setup | Review, strict persisted payload, quote/start | ✓ FLOWING |
| Delivery fields | User selection | Quote hash and generation configuration | ✓ FLOWING |
| Private media identity | Guest manifest or owned project asset row | Claim/version/reference validation | ✓ FLOWING |
| Pending Generate intent | Guest draft | Auth return and idempotent start | ✓ FLOWING IN TESTS; LIVE TRANSITION OPEN |

## Behavioral and Release Gates

| Gate | Result | Status |
|---|---|---|
| Focused creator smoke | 3 files, 12 tests passed | ✓ PASS |
| Full web regression | 52 files, 201 tests passed in the final UI pass | ✓ PASS |
| Workspace typecheck | All nine workspaces passed | ✓ PASS |
| Production build | Passed; only existing large-chunk advisory | ✓ PASS |
| Initial web bundle | 247,857 gzip bytes / 307,200-byte limit | ✓ PASS |
| Phase 3 code review | Clean after three adversarial fix rounds | ✓ PASS |
| Phase 3 security | 17/17 threats closed; no accepted risks | ✓ PASS |
| Rendered browser matrix | 16/16 combinations plus current boundary spot checks | ✓ PASS |
| Provisioned UAT | API unavailable on latest rerun; no mutation/provider call | ⚠️ NOT VERIFIED |

## Requirements Coverage

| Requirement group | Status | Evidence |
|---|---|---|
| SOURCE-01..03 | ✓ IMPLEMENTED / LIVE UAT OPEN | All five source starts, normalized facts/provenance, review, recovery, and service/product fixtures are automated; real private claim remains part of open UAT. |
| CREATE-01..06 | ✓ SATISFIED | Beginner language, outcomes, truthful templates/previews, configuration-bound quotes, and one-draft convergence pass. |
| CREATE-07..09 | ✓ SATISFIED | Presenter fails closed until supported; Kuwait campaign settings and exact final review are contract-bound and tested. |
| CREATE-10 | ✓ IMPLEMENTED / LIVE UAT OPEN | UI states and browser matrix pass; cross-process Generate success/recovery state remains unobserved. |

No Phase 3 requirement is orphaned from the eight plans.

## Anti-Patterns and Prohibitions

- No client fallback price, raw provider/model picker, fake generated success, demo-output substitution, or hidden generic Template payload fallback was found in the canonical path.
- Unsupported presenter modes are absent from Template Mode and rejected server-side before persistence, quote, reservation, charge, or provider work.
- Image and footage inputs require bounded actual-byte decode; MIME headers alone are insufficient.
- Evidence files passed the redaction gate and contain no provider request, attempt, paid cost, signed URL, secret, or private object key.

## Human Verification Required

### 1. Provision the non-paid integration stack

Start PostgreSQL, private S3-compatible storage, Mailpit, API, and worker with a fresh heartbeat. Enable authoritative quote readiness, then pause provider/render dispatch before any campaign submission.

**Expected:** Authentication, assets, and generation quote readiness are available together while no provider work can start.

### 2. Product golden path

Complete one product link or upload campaign through Generate-time email authentication, private claim, quote, submit, browser close/reload, and Projects recovery. Repeat the callback once.

**Expected:** Exact facts/media/settings return, checksums match, and exactly one project/version/run/reservation exists with no provider attempt.

### 3. Service golden path

Complete one salon/clinic/service campaign using booking or WhatsApp through the same sequence.

**Expected:** Exact business facts and campaign fields remain unchanged, the quote is authoritative, and the one durable run is recoverable.

## Gaps Summary

No remaining implementation or security blocker was found in the Phase 3 code surface. The web experience and automated contract gates are strong. Phase 3 must nevertheless remain open because its two defining end-to-end journeys have not been observed on the assembled authenticated API/storage/worker stack. The next phase must not become authoritative until that provisioned UAT passes.

---

_Verified: 2026-08-21T14:48:00+03:00_  
_Verifier: Codex primary agent running the GSD verifier workflow inline_
