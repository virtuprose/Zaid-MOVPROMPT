---
phase: 02-guest-authentication-and-data-integrity
reviewed: 2026-08-19T21:05:44Z
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
  critical: 3
  warning: 1
  info: 0
  total: 4
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-08-19T21:05:44Z
**Depth:** standard
**Files Reviewed:** 74
**Status:** issues_found

## Summary

Phase 02 has strong isolated server-side claim, storage, SSRF, rate-limit, and RLS coverage, but the browser's live Generate-time handoff does not use the canonical claim implementation. That leaves the primary authentication journey broken and bypasses the intended draft-ownership and receipt-cleanup guarantees. There is also a signed-URL persistence violation and a proven cleanup/retry race that can delete a verified asset.

Static verification passed for the API and web TypeScript projects. Focused API and web Vitest suites passed (47 tests), but they do not exercise the browser client against the changed claim route or the cleanup/retry interleaving below.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: The post-auth browser client sends the obsolete claim contract to the canonical claim route

**Classification:** BLOCKER

**File:** `apps/web/src/features/create/projectStore.ts:197`

**Also affects:** `apps/web/src/lib/api/portableApiClient.ts:112`, `apps/api/src/creator-routes.ts:188`, `apps/web/src/features/create/CreateStudio.tsx:863`

**Issue:** After authentication, `CreateStudio` calls `syncCreatorProject`, which calls `portableCreatorApi.claimDraft` with the legacy `ClaimDraftRequest` and expects a `ProjectResponse`. That client posts to `/api/v1/drafts/claim`, but the route now parses `GuestClaimSnapshot` and returns `GuestClaimResponse`; it requires `pendingGenerationId`, `snapshotDigest`, and `assetManifest`, none of which the client supplies. With portable auth enabled, the normal Generate → sign in → resume route therefore gets a validation failure before it can create the project or render. The canonical `claimGuestAssets`, checkpoint, and receipt-deletion functions are not called anywhere by the UI.

**Fix:** Make the UI construct and persist a `GuestClaimSnapshot`, call `claimGuestAssets`, verify its `GuestClaimReceipt` with `verifyAndDeleteVerifiedDraft`, and hydrate the returned canonical project/version before submitting generation. Remove the stale `portableCreatorApi.claimDraft` use (or restore it on a distinct route with a distinct contract). Add an end-to-end client/API contract test that starts at `CreateStudio`, authenticates, and asserts exactly one project, claim, version, and render submission.

### CR-02: Claimed private-asset signed URLs are written to durable browser storage

**Classification:** BLOCKER

**File:** `apps/web/src/features/create/projectStore.ts:29`

**Also affects:** `apps/web/src/features/create/creatorAssets.ts:242`, `apps/web/src/features/create/creatorAssets.ts:282`, `apps/web/src/features/create/projectStore.ts:45`

**Issue:** `writeLocal` removes only `videoUrl` before serializing the complete project to `localStorage`. Both `claimGuestImage` and `mirrorProductImages` assign `download.download.url` (a signed private object URL) to `product.images[].url`; `saveLocalCreatorProject` then serializes it unchanged. This directly violates the private-storage rule that signed URLs must not be persisted, exposes a bearer URL to durable same-origin storage, and guarantees stale previews after expiration.

**Fix:** Persist only asset identity and stable `storagePath`/metadata. Keep any signed asset URL in non-persisted component state, and obtain a fresh URL from the owned download endpoint when rendering a preview. Extend `projectStore.test.ts` to assert that serialized project JSON contains neither signed image URLs nor signature/query-token values.

### CR-03: Cleanup can delete an asset after a client retry has re-marked it verified

**Classification:** BLOCKER

**File:** `packages/db/src/abandoned-claim-cleanup-repository.ts:141`

**Also affects:** `apps/api/src/guest-claim-repository.ts:250`, `apps/worker/src/abandoned-claim-cleanup.ts:94`

**Issue:** Cleanup leases an old asset by changing it to `securing`, rechecks it, then deletes the object outside the database transaction. `markAssetVerified` accepts that same `securing` asset without checking that its cleanup metadata is leased and changes it back to `verified` at lines 271-276. If a user retry lands after `recheckLeasedCandidate` but before `storage.remove`, cleanup deletes the object; its later `complete` update affects zero rows because the asset is now `verified`. The claim can subsequently finalize and persist an asset record for an already deleted object.

**Fix:** Treat a cleanup lease as an exclusive state. `markAssetVerified` must reject/return retryable while `errorMetadata.cleanup.state = 'leased'` (and must use a conditional update that cannot overwrite it). Alternatively coordinate both finalization/retry and cleanup through the same per-claim advisory lock and only delete after an atomic state transition that a retry cannot reverse. Add an interleaving integration test covering lease → recheck → retry verification → delete.

## Warnings

### WR-01: Authentication email delivery failures are converted into successful auth/reset responses

**Classification:** WARNING

**File:** `packages/auth/src/auth.ts:23`

**Issue:** `dispatchEmail` deliberately fire-and-forgets the sender and catches every delivery failure. Better Auth can therefore report successful sign-up verification or password-reset initiation even when SMTP rejected the message; the error is only logged. That leaves users unable to verify or recover accounts with no recoverable UI state, contrary to the project error-handling convention that failures must not be silently converted into success.

**Fix:** Await the sender for reset/verification issuance, translate failures to a retryable domain/API error, and preserve rate limiting so the request cannot be abused to probe SMTP behavior. If asynchronous delivery is required, persist an outbox job and expose a truthful pending/retry state rather than claiming that the email was sent.

---

_Reviewed: 2026-08-19T21:05:44Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
