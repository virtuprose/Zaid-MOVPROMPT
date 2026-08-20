---
phase: 03-product-and-service-golden-paths
reviewed: 2026-08-21T01:38:00+03:00
depth: standard
files_reviewed: 73
files_reviewed_list:
  - apps/api/src/app.ts
  - apps/api/src/asset-repository.ts
  - apps/api/src/asset-routes.ts
  - apps/api/src/asset-storage.ts
  - apps/api/src/assets.test.ts
  - apps/api/src/campaign-eligibility.ts
  - apps/api/src/creator-repository.ts
  - apps/api/src/creator-routes.test.ts
  - apps/api/src/footage-verifier.test.ts
  - apps/api/src/footage-verifier.ts
  - apps/api/src/generation-repository.ts
  - apps/api/src/generation-routes.ts
  - apps/api/src/generation-service.test.ts
  - apps/api/src/generation-service.ts
  - apps/api/src/generation.test.ts
  - apps/api/src/guest-claim-repository.ts
  - apps/api/src/guest-claim-service.postgres.test.ts
  - apps/api/src/guest-claim-service.ts
  - apps/web/src/features/create/AuthGateDialog.test.tsx
  - apps/web/src/features/create/CampaignReviewStep.test.tsx
  - apps/web/src/features/create/CampaignReviewStep.tsx
  - apps/web/src/features/create/CampaignSetupStep.test.tsx
  - apps/web/src/features/create/CampaignSetupStep.tsx
  - apps/web/src/features/create/CreateStudio.tsx
  - apps/web/src/features/create/FactReviewStep.test.tsx
  - apps/web/src/features/create/FactReviewStep.tsx
  - apps/web/src/features/create/GoldenPathFlow.test.tsx
  - apps/web/src/features/create/GoldenPathStates.test.tsx
  - apps/web/src/features/create/OutcomeStep.tsx
  - apps/web/src/features/create/PresenterChoice.tsx
  - apps/web/src/features/create/PresenterStep.test.tsx
  - apps/web/src/features/create/SourceChoiceStep.test.tsx
  - apps/web/src/features/create/SourceChoiceStep.tsx
  - apps/web/src/features/create/TemplateGrid.test.tsx
  - apps/web/src/features/create/TemplateGrid.tsx
  - apps/web/src/features/create/TemplateRecommendation.test.tsx
  - apps/web/src/features/create/TemplateRecommendationCards.tsx
  - apps/web/src/features/create/__fixtures__/goldenPathFixtures.ts
  - apps/web/src/features/create/campaignDraft.test.ts
  - apps/web/src/features/create/campaignFacts.test.ts
  - apps/web/src/features/create/campaignSetupRules.ts
  - apps/web/src/features/create/contracts.ts
  - apps/web/src/features/create/creator.css
  - apps/web/src/features/create/creatorAssets.ts
  - apps/web/src/features/create/creatorProjectAssets.test.ts
  - apps/web/src/features/create/creatorProjectAssets.ts
  - apps/web/src/features/create/portableProjectMapper.test.ts
  - apps/web/src/features/create/portableProjectMapper.ts
  - apps/web/src/features/create/projectStore.test.ts
  - apps/web/src/features/create/projectStore.ts
  - apps/web/src/features/create/sourceFacts.ts
  - apps/web/src/features/create/templateQuoteState.test.ts
  - apps/web/src/features/create/templateQuoteState.ts
  - apps/web/src/features/create/templateRecommendations.test.ts
  - apps/web/src/features/create/templateRecommendations.ts
  - apps/web/src/features/create/templates.ts
  - apps/web/src/features/create/types.ts
  - apps/web/src/features/create/useTemplateQuotes.ts
  - apps/web/src/i18n/translations/ar.ts
  - apps/web/src/i18n/translations/en.ts
  - apps/web/src/lib/api/portableApiClient.ts
  - apps/worker/src/abandoned-claim-cleanup.ts
  - packages/contracts/src/assets.ts
  - packages/contracts/src/creator.test.ts
  - packages/contracts/src/creator.ts
  - packages/contracts/src/generation.ts
  - packages/contracts/src/guest-claims.ts
  - packages/creative-engine/src/types.test.ts
  - packages/db/migrations/0018_add_footage_asset_kind.sql
  - packages/db/migrations/0019_tighten_footage_verification.sql
  - packages/db/src/schema.ts
  - scripts/infra/check-phase3-evidence-redaction.mjs
  - scripts/infra/run-phase3-provisioned-uat.ts
findings:
  critical: 3
  warning: 1
  info: 0
  total: 4
status: issues_found
---

# Phase 03: Final Code Re-Review

**Reviewed:** 2026-08-21
**Depth:** standard
**Files reviewed:** 73
**Status:** issues_found

## Summary

This review covered the original 63-file Phase 03 scope plus the new verifier, API, contract, schema, migration, and test files introduced by commits `e263c95`, `6dcb8a5`, `bdeba36`, `5082bf3`, and `98e9972`.

The iteration-2 changes do close the previously reported direct-footage validation gap, server-side template capability selection, withdrawn-spokesperson state, and synchronous quote invalidation. The Advanced handoff fix works for assets that declare a video MIME type, but it is not fail-closed for legacy or malformed assets with no MIME type. More importantly, the implementation still permits unverified/counterfeit semantic inputs for safety-sensitive templates, allows arbitrary bytes through the direct signed-image path, and has a migration that can fail on legal existing rows.

Focused regression runs passed: API 39 passed / 6 PostgreSQL-gated skipped; web 13 passed. The provisioned PostgreSQL and rendered-browser UAT remain evidence blockers, not findings in this report.

## Narrative Findings (AI reviewer)

## Blockers

### CR-01: Direct signed image uploads are marked ready without server-side byte validation

**Classification:** BLOCKER

**File:** `apps/api/src/asset-routes.ts:161-201, 720-746`

**Issue:** The public upload-url route supplies a direct signed PUT path. On its completion path, `verifyStoredObject` verifies only S3-controlled length, caller-chosen MIME metadata, and a checksum supplied by the same caller. Unlike the proxy upload path at lines 522-554, completion never reads image bytes or verifies a JPEG/PNG/WebP signature/decoder. A client can therefore PUT arbitrary bytes with an image content type and matching checksum, complete the claim, and create a generation reference that passes `assertOwnedGenerationReferences` because that later check also trusts the recorded MIME/checksum.

**Fix:** Make completion re-read every direct-uploaded image through a bounded storage read and validate the image signature (preferably decode it and derive dimensions) before `markAssetVerified`. Centralize the image and footage verification behind one server verifier, and add an API test that performs a signed-path completion with arbitrary bytes labelled `image/png` and expects `422 invalid_asset_content`.

### CR-02: Safety- and truth-critical template requirements collapse to ordinary non-empty strings or any reference

**Classification:** BLOCKER

**File:** `apps/api/src/generation-service.ts:205-260, 462-489`

**Issue:** `hasRequiredInput` treats `verified_clinic_identity`, `confirmed_service`, `approved_claims`, `verified_qualification`, and `approved_transcript` exactly like any non-empty `subjectName`. It also treats every `consented_*` requirement as any image reference. Thus a clinic campaign can claim a made-up business name is a verified clinic and an arbitrary price is approved; a practitioner template can pass `consented_person_reference` with an unrelated product image; and a salon before/after template can pass both consented before/after inputs with one arbitrary image. The subsequent template eligibility check relies entirely on this function, so quote and render submission accept these configurations.

**Fix:** Add immutable, typed fact/provenance and consent records to the project version (for example `verifiedClinicIdentity`, `confirmedService`, `approvedClaims`, `verifiedQualification`, and consent records keyed to distinct asset IDs). Resolve each `TemplateRequiredInput` against its specific record and source asset, not a generic name/reference count. Disable clinic, practitioner, and real-transformation template versions until those checks are present, and add negative quote/start tests for every protected input.

### CR-03: Migration 0019 can prevent deployment when existing WebM footage rows exist

**Classification:** BLOCKER

**File:** `packages/db/migrations/0019_tighten_footage_verification.sql:3-27`

**Issue:** Migration `0018` explicitly permitted `video/webm` for footage. Migration `0019` drops that constraint and immediately adds a stricter validated constraint that excludes WebM. PostgreSQL validates existing rows when adding this check constraint, so a database containing any previously valid WebM footage asset or guest-claim asset will reject the migration outright. This violates the phase requirement to preserve existing user data and makes a production rollout non-deployable for affected databases.

**Fix:** Add a pre-migration audit and a preservation path: keep existing rows readable/quarantined with an explicit legacy state, while rejecting only new WebM uploads; or add the constraint `NOT VALID`, reconcile/convert or retire affected assets through a user-visible migration flow, then validate it after no incompatible rows remain. Test migration against fixtures containing legacy WebM asset and guest-claim rows.

## Warnings

### WR-01: The Advanced-handoff and image-required preflight remain fail-open for assets with no MIME type

**Classification:** WARNING

**Files:** `apps/web/src/features/create/projectStore.ts:23-29`, `apps/web/src/features/create/templates.ts:72-75`, `apps/web/src/features/create/CreateStudio.tsx:1364`

**Issue:** The fix filters values only when `mimeType` explicitly starts with `video/`; an asset with `mimeType: undefined` is still passed into Advanced image references and is counted as an image reference for a template. `CreatorAsset.mimeType` is optional, so retained legacy/local data can contain an uploaded MOV without that field. This does not meet the stated “only still-image references” contract and can restore the original media-type confusion for incomplete metadata.

**Fix:** Fail closed for uploaded/cloud assets: include them only when their MIME type is an allowed image MIME. Permit MIME-less data only for an explicit safe sample fixture if needed. Apply the same predicate in `imageReferencesForAdvancedHandoff`, `hasCreatorImageReference`, and the legacy `referenceImages` mapping; add a test with a MIME-less uploaded asset and a MIME-less sample asset.

---

_Reviewed: 2026-08-21T01:38:00+03:00_
_Reviewer: gsd-code-reviewer_
_Depth: standard_
