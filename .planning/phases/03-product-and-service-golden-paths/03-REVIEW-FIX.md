---
phase: 03-product-and-service-golden-paths
fixed_at: 2026-08-20T21:52:59Z
review_path: .planning/phases/03-product-and-service-golden-paths/03-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
verification_location: main checkout
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-08-20T21:52:59Z  
**Source review:** [03-REVIEW.md](03-REVIEW.md)  
**Iteration:** 1  
**Verification location:** Main checkout (`codex/production-rebuild`)

## Summary

- Findings in scope: 8
- Fixed: 8
- Skipped: 0
- Paid provider calls: none

## Fixed Issues

### CR-01: Accepted footage uploads cannot complete secure claim or reach generation

**Files modified:** `apps/api/src/asset-routes.ts`, `apps/api/src/creator-repository.ts`, `apps/web/src/features/create/CreateStudio.tsx`, `apps/web/src/features/create/creatorAssets.ts`, `apps/web/src/features/create/PresenterChoice.tsx`, `packages/contracts/src/creator.ts`, and focused tests.

**Commits:** `d2c8168`, `c90e1b4`

**Applied fix:** MP4/MOV claim manifests now retain footage kind, bounded verified duration, checksum, and MIME data; private asset handling preserves footage separately from image-only generation references. Presenter eligibility checks the exact owned footage asset before quote and render reservation. The client retains an actionable unsupported-media error while accepting the allowed video formats.

### CR-02: Manual source campaigns are blocked despite satisfying their stated fact requirements

**Files modified:** `apps/web/src/features/create/CampaignReviewStep.tsx`, `apps/web/src/features/create/CreateStudio.tsx`, `apps/web/src/features/create/templates.ts`, and focused tests.

**Commits:** `84bb35c`, `ae59c60`

**Applied fix:** The final-review and submit path now use the selected template's source-media requirement rather than an unconditional image requirement. Manual service campaigns with a fact-only recipe proceed; templates that genuinely require media remain blocked with an explicit reason.

### CR-03: A WhatsApp number satisfies booking-only template eligibility on the server

**Files modified:** `apps/api/src/generation-service.ts` and focused API tests.

**Commits:** `472c016`, `7cc2fb9`

**Applied fix:** Booking destination is now a validated booking URL only. WhatsApp remains eligible only for explicit WhatsApp/order-or-booking/delivery requirements, and quote plus render endpoints reject a booking-only configuration that provides WhatsApp alone.

### WR-01: Campaign setup remains indefinitely in a false confirming-price state

**Files modified:** `apps/web/src/features/create/CampaignSetupStep.tsx` and focused tests.

**Commit:** `96918f1`

**Applied fix:** Local price-refresh state now yields to the matching authoritative ready quote after an edit, so the screen returns from “Confirming the current price” to a truthful ready state.

### WR-02: Uploaded spokesperson is permanently hidden for verified compatible footage

**Files modified:** `apps/web/src/features/create/CreateStudio.tsx`, `apps/web/src/features/create/PresenterChoice.tsx`, and focused tests.

**Commit:** `d2c8168`

**Applied fix:** The create flow derives presenter compatibility from the selected template and securely verified footage. The uploaded-spokesperson option is available only for eligible footage and retains the exact-footage rights acknowledgement.

### WR-03: Guest-local asset IDs remain inside the persisted campaign source after secure claim

**Files modified:** `apps/api/src/guest-claim-repository.ts`, `apps/web/src/features/create/creatorProjectAssets.ts`, `apps/web/src/features/create/portableProjectMapper.ts`, and focused tests.

**Commits:** `234fcd9`, `cd479ed`, `9c8dc0d`

**Applied fix:** Claim receipts rebuild source keys from owned private object keys. Cloud persistence now removes guest-local keys while retaining durable product and service/footage source keys, so source hydration round-trips without signed URLs or IndexedDB identifiers.

### WR-04: Local fallback templates remain selectable while the published catalog is unavailable

**Files modified:** `apps/web/src/features/create/TemplateGrid.tsx` and focused tests.

**Commit:** `dd25ab8`

**Applied fix:** Portable-mode fallback cards are preview-only during a catalog outage. Selection is disabled until a published catalog is available, with retry restoring the normal selection path.

### WR-05: Source-selection radio groups are not keyboard-operable as radio groups

**Files modified:** `apps/web/src/features/create/SourceChoiceStep.tsx` and focused tests.

**Commit:** `2d78313`

**Applied fix:** Source and subject groups now use roving tab order plus Arrow, Home, and End handling with focus movement, matching the ARIA radio-group interaction model.

## Verification Evidence

Focused verification:

- API review tests: 40 passed; 6 provisioned-PostgreSQL tests skipped by their environment guard.
- Web review tests: 29 passed.
- Contracts review tests: 12 passed.
- The two contained corrections added during this resumed pass passed their focused tests and web typecheck.

Broader verification:

- `bun run --cwd apps/web test`: 52 files, 189 tests passed.
- `bun run --cwd apps/api test`: 16 files, 92 tests passed; 13 provisioned/integration tests skipped.
- `bun run --cwd apps/worker test`: 15 files, 67 tests passed; 9 provisioned/integration tests skipped.
- `bun run --cwd packages/contracts test`: 2 files, 12 tests passed.
- `bun run test:creator-smoke`: 3 files, 12 tests passed.
- Typechecks passed for web, API, worker, and contracts.
- `bun run build` passed. Vite reported existing large-chunk advice, not a build failure.

## Remaining Blockers

No critical or warning review finding remains open. The provisioned PostgreSQL/browser UAT scenarios remain environment-gated and were not exercised in this code-review pass; they are Phase 03 release-evidence work, not a source-level review failure. No video provider call or paid generation was made.

---

_Fixed: 2026-08-20T21:52:59Z_  
_Fixer: the agent (gsd-code-fixer)_  
_Iteration: 1_
