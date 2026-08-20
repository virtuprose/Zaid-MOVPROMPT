---
phase: 03-product-and-service-golden-paths
fixed_at: 2026-08-21T01:26:00+03:00
review_path: .planning/phases/03-product-and-service-golden-paths/03-REVIEW.md
iteration: 2
findings_in_scope: 13
fixed: 13
skipped: 0
status: all_fixed
verification_location: main checkout
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-08-21T01:26:00+03:00
**Source review:** [03-REVIEW.md](03-REVIEW.md)  
**Iteration:** 2
**Verification location:** Main checkout (`codex/production-rebuild`)

## Summary

- Findings in scope: 13
- Fixed: 13
- Skipped: 0
- Paid provider calls: none

Iteration 1's eight findings remain fixed. This iteration closed the five re-review findings below.

## Iteration 2 Fixed Issues

### CR-01: Footage completion trusted upload metadata instead of verified media bytes

**Files modified:** `apps/api/src/footage-verifier.ts`, `apps/api/src/asset-routes.ts`, `apps/api/src/asset-repository.ts`, asset/claim contracts and schema migration `0019_tighten_footage_verification.sql`, plus focused tests.

**Commit:** `e263c95`

**Applied fix:** Direct signed uploads and proxy uploads now use one bounded server-side verifier. It re-reads the private object where required, validates the stored checksum and ISO base-media signature, runs FFprobe against a temporary bounded file, permits only MP4/MOV plus supported video codecs, and persists the probe-derived duration only when it is at most ten minutes. Missing verifier tooling fails closed. Faked MP4 headers, spoofed checksums, unavailable FFprobe, and overlong media are covered by tests.

### CR-02: Beginner capability was browser-hardcoded rather than derived from template policy

**Files modified:** `apps/api/src/generation-service.ts`, `packages/contracts/src/generation.ts`, `apps/web/src/features/create/useTemplateQuotes.ts`, `CreateStudio.tsx`, review/template helpers, and focused API tests.

**Commits:** `6dcb8a5`, `5082bf3`

**Applied fix:** Beginner template quotes now resolve their semantic video capability from the immutable published template policy. Manual/service templates select `video.cinematic` only when that policy permits it; image-required templates select product fidelity and remain blocked without an image. Authenticated project-version quotes apply the same server policy. The browser no longer sends a hardcoded template capability or any provider/model identifier.

### CR-03: Withdrawn uploaded-spokesperson consent left a selected presenter in saved state

**Files modified:** `apps/web/src/features/create/PresenterChoice.tsx` and `PresenterStep.test.tsx`.

**Commit:** `bdeba36`

**Applied fix:** Removing the acknowledgement immediately emits and persists `{ mode: "none" }`, returns the control to No presenter, and removes the consent UI. The reload path is covered by a controlled re-render test.

### WR-01: A stale generation quote could remain usable while template lookup was pending

**Files modified:** `apps/web/src/features/create/useTemplateQuotes.ts`, `templateQuoteState.ts`, and focused tests.

**Commit:** `5082bf3`

**Applied fix:** The shared quote is synchronously set to loading and cleared before the asynchronous template-version lookup begins. Review and Generate therefore fail closed immediately after price, duration, or ratio changes.

### WR-02: Advanced handoff placed MOV footage in image-reference inputs

**Files modified:** `apps/web/src/features/create/projectStore.ts`, `CreateStudio.tsx`, and focused tests.

**Commit:** `98e9972`

**Applied fix:** The Advanced handoff now passes only still-image references. Footage is deliberately omitted until Advanced has a dedicated supported footage field; the mixed image-and-MOV test proves that only the image survives the handoff.

## Iteration 1 Findings Still Fixed

- CR-01: accepted footage claim persistence and presenter eligibility
- CR-02: fact-only manual service campaigns where the template permits them
- CR-03: booking URL distinct from WhatsApp eligibility
- WR-01: campaign setup quote refresh state
- WR-02: verified uploaded-spokesperson availability
- WR-03: durable source keys after guest claim
- WR-04: published catalog availability before template selection
- WR-05: keyboard-operable source radio groups

## Verification Evidence

Focused verification in the main checkout:

- API: 39 tests passed across footage verification, asset routes, and generation-service policy coverage.
- Web: 13 tests passed across presenter consent, quote state, and Advanced-handoff coverage.
- Contracts: 12 tests passed.

Required broader verification:

- Web, API, worker, and contracts typechecks passed.
- `apps/web` suite: 52 files, 192 tests passed.
- `apps/api` suite: 17 files, 100 tests passed; 3 files / 13 tests skipped by their PostgreSQL environment guards.
- `apps/worker` suite: 15 files, 67 tests passed; 2 files / 9 tests skipped by their PostgreSQL environment guards.
- `packages/contracts` suite: 2 files, 12 tests passed.
- Creator smoke: 3 files, 12 tests passed.
- Production web build passed. Vite emitted existing large-chunk advisory warnings only.

No disposable PostgreSQL database was created because the relevant provisioned tests are environment-gated; no existing database or user data was touched.

## Remaining Blockers

No critical or warning review finding remains open. The skipped provisioned PostgreSQL and browser UAT scenarios are release-evidence work and still require their documented dedicated environments. No provider calls or paid generations were made.

---

_Fixed: 2026-08-21T01:26:00+03:00_
_Fixer: the agent (gsd-code-fixer)_  
_Iteration: 2_
