---
phase: 02-guest-authentication-and-data-integrity
reviewed: 2026-08-19T21:41:26Z
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

**Reviewed:** 2026-08-19T21:41:26Z
**Depth:** standard
**Files Reviewed:** 74
**Status:** issues_found

## Summary

Iteration 2 correctly fixed the prior link-import ordering defect: remote images now mirror and persist into a source version before IndexedDB cleanup. The focused claim, source-persistence, and recovery suites pass, as do the web and API typechecks.

One blocker remains in the recovery path. If source persistence succeeds but IndexedDB cleanup fails, the user is told the draft is unchanged. Retrying then derives a new source-replacement idempotency key from the already-advanced current version, creating another immutable source version without a user change. This is a data-integrity/replay failure in precisely the failure-preservation path Phase 2 promises.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Cleanup-failure retry duplicates immutable source versions

**Classification:** BLOCKER

**File:** `apps/web/src/features/create/guestClaimRecovery.ts:154-157`

**Also affects:** `apps/web/src/features/create/CreateStudio.tsx:956-975`, `apps/web/src/features/create/creatorProjectAssets.ts:31-57`, `apps/web/src/features/create/projectStore.ts:316-344`

**Issue:** `persistBeforeVerifiedDraftCleanup` correctly persists the mirrored source version before deleting IndexedDB. However, `deleteVerifiedGuestDraft` is a separate IndexedDB operation and can fail after `persist()` has already succeeded. The helper then rejects with the same “local draft is unchanged” recovery path. On retry, `claimGuestProject` loads the original local project, gets the cloud project whose `currentVersion` is now the already-persisted source version, and calls `replaceCreatorProjectSource` again. Its idempotency key includes `existing.currentVersion.id` (`source-change:${project.id}:${existing.currentVersion.id}:...`), so the retried request has a different key and a different parent version. The repository therefore creates a second, identical source-replacement version. This breaks exact replay/immutable-version correctness and can repeatedly advance the working version after any client-side cleanup interruption.

**Fix:** Persist a stable, receipt-bound “source persistence completed” marker containing the resulting project/version identity before cleanup, and make retries first verify/reuse that version rather than invoke source replacement again. Alternatively make the source-replacement idempotency key derive solely from the immutable claim receipt/pending intent and require the API to return the same version for that operation regardless of the current working version. Add a regression test for guest link → mirror/source replacement succeeds → IndexedDB cleanup throws → reload/retry, asserting exactly one source version and one working-version transition.

## Verified Resolutions from Prior Iterations

- **Original CR-01:** `CreateStudio` now builds and checkpoints `GuestClaimSnapshot`, uses `claimGuestAssets`, verifies the `GuestClaimReceipt`, and routes non-guest claims to `/api/v1/projects/claim`.
- **Original CR-02:** `projectStore.writeLocal` strips signed image, logo, and render URLs; its regression test checks stored JSON contains no signing tokens.
- **Original CR-03:** `markAssetVerified` now refuses an active cleanup lease, and PostgreSQL coverage exercises the lease/retry interleaving.
- **Original WR-01:** verification and reset senders are awaited and delivery failures become a sanitized authentication error.
- **Iteration-2 CR-01:** the link-import flow now waits for remote-image mirroring and immutable source persistence before attempting IndexedDB cleanup; a mirror failure preserves the source URL, checkpoint, and local blobs.

---

_Reviewed: 2026-08-19T21:41:26Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
