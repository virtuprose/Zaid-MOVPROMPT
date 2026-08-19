---
phase: 02-guest-authentication-and-data-integrity
reviewed: 2026-08-20T00:31:00+03:00
depth: standard
files_reviewed: 74
files_reviewed_list:
  - apps/api/src/app.test.ts
  - apps/api/src/app.ts
  - apps/api/src/asset-repository.ts
  - apps/api/src/asset-routes.ts
  - apps/api/src/assets.test.ts
  - apps/api/src/auth-gateway.ts
  - apps/api/src/auth-provider-stubs.test.ts
  - apps/api/src/config.ts
  - apps/api/src/creator-repository.ts
  - apps/api/src/creator-routes.postgres.test.ts
  - apps/api/src/creator-routes.test.ts
  - apps/api/src/creator-routes.ts
  - apps/api/src/guest-claim-repository.ts
  - apps/api/src/guest-claim-service.postgres.test.ts
  - apps/api/src/guest-claim-service.ts
  - apps/api/src/network-media-policy.ts
  - apps/api/src/remote-image-fetcher.test.ts
  - apps/api/src/remote-image-fetcher.ts
  - apps/api/src/request-rate-limiter.test.ts
  - apps/api/src/request-rate-limiter.ts
  - apps/api/src/runtime-services.ts
  - apps/api/src/source-change-service.test.ts
  - apps/api/src/source-change-service.ts
  - apps/api/src/source-scanner.test.ts
  - apps/api/src/source-scanner.ts
  - apps/api/src/test/auth-provider-stubs.ts
  - apps/web/src/config/authProviders.test.ts
  - apps/web/src/config/authProviders.ts
  - apps/web/src/features/create/AuthGateDialog.test.tsx
  - apps/web/src/features/create/AuthGateDialog.tsx
  - apps/web/src/features/create/CreateStudio.tsx
  - apps/web/src/features/create/CreatorShell.tsx
  - apps/web/src/features/create/GuestAuthRecovery.test.tsx
  - apps/web/src/features/create/creatorAssets.test.ts
  - apps/web/src/features/create/creatorAssets.ts
  - apps/web/src/features/create/creatorProjectOutput.test.ts
  - apps/web/src/features/create/creatorProjectOutput.ts
  - apps/web/src/features/create/guestClaimRecovery.test.ts
  - apps/web/src/features/create/guestClaimRecovery.ts
  - apps/web/src/features/create/guestDraftStore.test.ts
  - apps/web/src/features/create/guestDraftStore.ts
  - apps/web/src/features/create/projectStore.test.ts
  - apps/web/src/features/create/projectStore.ts
  - apps/web/src/i18n/translations/ar.ts
  - apps/web/src/i18n/translations/en.ts
  - apps/web/src/lib/auth/returnPath.test.ts
  - apps/web/src/lib/auth/returnPath.ts
  - apps/web/src/pages/Auth.tsx
  - apps/web/src/pages/AuthCallback.tsx
  - apps/web/src/pages/AuthCopy.test.ts
  - apps/web/src/pages/ResetPassword.tsx
  - apps/worker/src/abandoned-claim-cleanup.test.ts
  - apps/worker/src/abandoned-claim-cleanup.ts
  - apps/worker/src/main.ts
  - apps/worker/src/pg-boss-worker.ts
  - packages/auth/src/auth.ts
  - packages/auth/src/config.ts
  - packages/auth/test/config.test.ts
  - packages/contracts/src/api.ts
  - packages/contracts/src/assets.ts
  - packages/contracts/src/creator.ts
  - packages/contracts/src/guest-claims.ts
  - packages/contracts/src/index.ts
  - packages/db/migrations/0015_guest_claim_operations.sql
  - packages/db/migrations/0016_request_rate_limits.sql
  - packages/db/migrations/0017_force_phase2_owner_rls.sql
  - packages/db/migrations/meta/_journal.json
  - packages/db/src/abandoned-claim-cleanup-repository.ts
  - packages/db/src/schema.ts
  - packages/db/test/creator-data-plane.postgres.test.ts
  - scripts/infra/check-phase2-evidence-redaction.mjs
  - scripts/infra/check-rls-isolation.sql
  - scripts/infra/validate-phase2-migrations.sh
  - scripts/infra/validate-phase2-migrations.test.sh
findings:
  critical: 1
  warning: 0
  info: 0
  total: 1
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-08-20T00:31:00+03:00
**Depth:** standard
**Files Reviewed:** 74
**Status:** issues_found

## Summary

Iteration 1 correctly repaired the original route-contract break, durable signed-URL persistence, cleanup-lease race, and email-delivery accuracy defect. The canonical guest snapshot is now built and checkpointed before the claim, its receipt is verified before the local draft is removed, and the old non-guest claim flow now has a distinct route. The focused web/API/auth suites and all three reviewed TypeScript projects pass.

One blocker remains: the link-import variant removes the guest draft before remote source images have been mirrored and durably versioned. A transient mirror failure immediately after a successful empty-asset claim therefore destroys the only recoverable copy of the imported source URLs and can leave the cloud project with no usable product asset.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Guest link-import cleanup happens before remote images are safely claimed

**Classification:** BLOCKER

**File:** `apps/web/src/features/create/CreateStudio.tsx:954-974`

**Also affects:** `apps/web/src/features/create/guestClaimRecovery.ts:117-125`, `apps/web/src/features/create/creatorAssets.ts:242-282`, `apps/web/src/features/create/portableProjectMapper.ts:18-38`

**Issue:** A guest-created product/business link has `source: "url"` images but no local blobs, so the snapshot's asset manifest is empty. The canonical claim finalizes immediately. `claimGuestProject` then calls `verifyAndDeleteVerifiedDraft` at line 955, which clears IndexedDB (including the imported remote URLs), and only afterward tries `mirrorProductImages` at line 969. If mirroring fails because the upstream image, storage, or network is temporarily unavailable, the function throws after deletion. The claimed version intentionally redacts `sourceUrl` and image `url` fields, so a reload cannot recover the remote source from the cloud either. This violates the required exact-recovery and failure-preservation behavior for guest link import.

**Fix:** Treat the remote images as required claim assets before cleanup, or defer `verifyAndDeleteVerifiedDraft` until every remote image has been mirrored, a new immutable version persists the stable object keys, and that version/receipt has been verified. On any mirror or version failure, retain the IndexedDB draft/checkpoint and show a retry action. Add an end-to-end test for guest link → auth → forced mirror failure → reload/retry, then assert no local source field/blob is lost.

## Verified Resolutions from Iteration 1

- **Original CR-01:** `CreateStudio` now builds and checkpoints `GuestClaimSnapshot`, uses `claimGuestAssets`, verifies the `GuestClaimReceipt`, and routes non-guest claims to `/api/v1/projects/claim`.
- **Original CR-02:** `projectStore.writeLocal` strips signed image, logo, and render URLs; its regression test checks stored JSON contains no signing tokens.
- **Original CR-03:** `markAssetVerified` now refuses an active cleanup lease, and PostgreSQL coverage exercises the lease/retry interleaving.
- **Original WR-01:** verification and reset senders are awaited and delivery failures become a sanitized authentication error.

---

_Reviewed: 2026-08-20T00:31:00+03:00_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
