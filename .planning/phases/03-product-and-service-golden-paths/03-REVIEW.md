---
phase: 03-product-and-service-golden-paths
reviewed: 2026-08-21T00:00:00+03:00
depth: standard
files_reviewed: 63
files_reviewed_list:
  - apps/api/src/asset-routes.ts
  - apps/api/src/assets.test.ts
  - apps/api/src/campaign-eligibility.ts
  - apps/api/src/creator-repository.ts
  - apps/api/src/creator-routes.test.ts
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
  - packages/creative-engine/src/types.test.ts
  - packages/db/migrations/0018_add_footage_asset_kind.sql
  - scripts/infra/check-phase3-evidence-redaction.mjs
  - scripts/infra/run-phase3-provisioned-uat.ts
findings:
  critical: 3
  warning: 2
  info: 0
  total: 5
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-08-21
**Depth:** standard
**Files reviewed:** 63 (the original 50-file scope plus every source/test file changed by fixes `472c016` through `9c8dc0d`)
**Status:** issues_found

## Summary

The fixes correctly improve booking versus WhatsApp validation, owner-scoped asset lookup, durable claimed asset keys, portable catalog fallback selection, and the template-card radio interaction. They do not yet complete the end-to-end safety and eligibility contracts. In particular, a direct S3 upload can claim arbitrary bytes as footage, a no-media/manual campaign is still forced through the image-only product-fidelity capability after authentication, and revoking the uploaded-spokesperson consent checkbox does not revoke the authoritative presenter selection.

The unprovisioned Phase 03 UAT remains an evidence blocker, as requested; it is not counted as a code finding here.

## Narrative Findings (AI reviewer)

## Blockers

### CR-01 — Footage is accepted from a direct upload using only caller-controlled metadata

**Classification:** BLOCKER

**Files:** `apps/api/src/asset-routes.ts:338-432`, `apps/api/src/asset-routes.ts:621-646`, `apps/api/src/campaign-eligibility.ts:55-65`, `packages/contracts/src/assets.ts:30-47`

**Issue:** The public `upload-url` endpoint lets an authenticated caller upload directly to storage. The later `complete` endpoint only compares S3 object length, content type, and the checksum supplied by that same caller; it never reads or parses the object. The proxy content endpoint does run `hasExpectedFootageSignature`, but that path is bypassed by the signed upload URL, and its MP4/MOV check is only the four-byte `ftyp` marker anyway. `durationMs` is likewise accepted from client metadata and `validFootage` trusts it. Therefore arbitrary bytes prefixed with an ISO-base-media marker, with a chosen checksum and claimed duration, can become a verified uploaded spokesperson asset.

This breaks the claimed MP4/MOV/footage integrity boundary and means compatibility/consent gates are based on unverified media metadata rather than a decodable, duration-bounded video.

**Fix:** Make completion server-verify every direct upload before `markAssetVerified`: stream the object to a bounded temporary file, run FFprobe (or a robust media parser), require a decodable allowed container/codec, obtain duration from the media itself, reject duration over ten minutes, and persist the verified MIME/duration/checksum. Apply equivalent validation to the proxy path through one shared verifier. Do not mark an asset verified from object headers alone. Add integration tests for a signed-upload arbitrary-byte payload, an `ftyp`-only fake MP4/MOV, a spoofed duration, and a valid MP4/MOV.

### CR-02 — Manual and footage-only campaigns still cannot obtain the authenticated quote

**Classification:** BLOCKER

**Files:** `apps/web/src/features/create/CampaignReviewStep.tsx:108-112`, `apps/web/src/features/create/CreateStudio.tsx:1314-1321`, `apps/web/src/features/create/projectStore.ts:172-178`, `apps/api/src/generation-service.ts:434-445`

**Issue:** The review UI deliberately permits templates with no required source media, such as the clinic service explainer, and considers a footage upload to satisfy generic source-media requirements. After authentication, however, `CreateStudio` always requests the authoritative quote with `video.product_fidelity`. `buildPortableGenerationConfiguration` deliberately omits footage from its image-only `references`, while the generation service rejects every product-fidelity quote with no image reference. A manual/no-media service campaign and a footage-only campaign therefore appear eligible through review and authentication but fail at the confirmed-price step.

The remediation for the original manual-source blocker only changed client-side eligibility; it did not make the server capability choice agree with the template's input/capability policy.

**Fix:** Resolve the capability server-side from the immutable template version and its actual required inputs. Use an approved non-image-reference capability for templates that do not require a product/reference image, or explicitly require an image in those templates before review. Make the UI invoke the same template capability policy rather than hardcoding `video.product_fidelity`, and add full guest-to-authenticated API tests for manual service, image-only, and footage-only paths.

### CR-03 — Removing spokesperson consent leaves the authoritative presenter selected

**Classification:** BLOCKER

**File:** `apps/web/src/features/create/PresenterChoice.tsx:84-97`

**Issue:** `updateUploadedPresenter` updates local checkbox state and immediately returns when consent is unchecked or no asset is selected. It never calls `onChange` to remove the existing `uploaded_spokesperson` value. If a user had selected and attested footage, then clears the checkbox, the UI indicates that consent is absent while the project configuration still contains the previous presenter, asset ID, and `personMediaRightsAttested: true`. A subsequent render can therefore use the retained identity despite the visible consent revocation.

**Fix:** On every invalidation (`!assetId || !attested`), call `onChange({ mode: "none" })` or an explicit non-renderable presenter state that removes the asset and rights record from the project. Drive checkbox state from the authoritative value after the change. Add tests that select verified footage, uncheck consent, persist/reload the draft, and assert both the render button and submitted configuration contain no uploaded spokesperson.

## Warnings

### WR-01 — A changed campaign can briefly present and use the previous quote

**Classification:** WARNING

**Files:** `apps/web/src/features/create/useTemplateQuotes.ts:39-57`, `apps/web/src/features/create/CampaignSetupStep.tsx:39-55`

**Issue:** After an input edit, the quote hook first awaits `resolvePortableTemplateVersionId` and only then sets quote state to loading. Until that await resolves, the shared quote state remains `ready` with the old quote. `CampaignSetupStep` masks this only inside its own screen with `localQuoteRefresh`; the review screen receives the raw quote state. A user can continue immediately after an economically relevant change and see/click Generate with the previous price until the asynchronous refresh catches up. The later authoritative quote prevents an unsafe charge, but the product can show a stale confirmed price and unexpectedly interrupt the flow after authentication.

**Fix:** Invalidate the shared quote synchronously when the configuration key changes, before any asynchronous template-ID resolution. Expose the pending state to both setup and review, disable Generate while it is pending, and add a test that changes price, duration, or ratio then immediately continues to review.

### WR-02 — Switching a template draft to Advanced Mode forwards footage as an image reference

**Classification:** WARNING

**File:** `apps/web/src/features/create/CreateStudio.tsx:1000-1008`

**Issue:** The portable generation mapper correctly excludes footage from image-only references, but `switchToAdvanced` maps every `project.product.images` item into `advanced.references` without checking MIME type. A project with an uploaded spokesperson MOV/MP4 therefore sends its footage key into the Advanced image-reference handoff. That breaks the image-versus-footage separation fixed elsewhere and causes downstream Advanced validation/provider preparation to reject or misclassify the asset.

**Fix:** Filter Advanced visual references to verified `image/*` assets, and pass verified footage through a dedicated presenter/footage field only when the selected Advanced capability explicitly supports it. Add a handoff test containing one product image and one MOV asset and assert only the image is present in `advanced.references`.

---

_Reviewed: 2026-08-21_
_Reviewer: gsd-code-reviewer_
_Depth: standard_
