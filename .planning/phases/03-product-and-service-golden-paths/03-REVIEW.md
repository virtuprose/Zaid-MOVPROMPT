---
phase: 03-product-and-service-golden-paths
reviewed: 2026-08-21T02:01:00+03:00
depth: standard
files_reviewed: 75
files_reviewed_list:
  - apps/api/src/app.ts
  - apps/api/src/asset-content-verifier.ts
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
  - apps/web/src/features/create/templates.test.ts
  - apps/web/src/features/create/templates.ts
  - apps/web/src/features/create/types.ts
  - apps/web/src/features/create/useTemplateQuotes.ts
  - apps/web/src/i18n/translations/ar.ts
  - apps/web/src/i18n/translations/en.ts
  - apps/web/src/lib/api/portableApiClient.ts
  - apps/worker/src/abandoned-claim-cleanup.ts
  - apps/worker/src/reference-frame-preparer.ts
  - apps/worker/src/render-lifecycle.ts
  - packages/contracts/src/assets.ts
  - packages/contracts/src/creator.test.ts
  - packages/contracts/src/creator.ts
  - packages/contracts/src/generation.ts
  - packages/contracts/src/guest-claims.ts
  - packages/creative-engine/src/types.test.ts
  - packages/db/migrations/0018_add_footage_asset_kind.sql
  - packages/db/migrations/0019_tighten_footage_verification.sql
  - packages/db/src/schema.ts
  - packages/db/test/footage-migration.postgres.test.ts
  - packages/storage/src/service.ts
  - scripts/infra/check-phase3-evidence-redaction.mjs
  - scripts/infra/run-phase3-provisioned-uat.ts
findings:
  critical: 2
  warning: 0
  info: 0
  total: 2
status: issues_found
---

# Phase 03: Final Independent Post-Fix Code Review

**Reviewed:** 2026-08-21
**Depth:** standard
**Files Reviewed:** 75
**Status:** issues_found

## Summary

This re-review independently checked the complete Phase 03 scope and the third-pass changes in commits `18f2a9e`, `4ec5417`, `671fbd8`, `5163ece`, and `baf9de2`. The direct-upload route now reads stored bytes, protected clinic/practitioner/transformation templates fail closed, the WebM migration preserves legacy rows, and image-reference MIME checks fail closed.

However, two release-blocking defects remain. The new image verifier accepts structurally incomplete files as valid images, and the visible AI UGC/uploaded-spokesperson controls never reach the worker's provider request. Both contradict the claimed trusted-media and presenter behavior.

Focused read-only verification passed:

- API assets and generation service: 47 tests.
- Web template/project-store: 12 tests.
- PostgreSQL 17 footage migration compatibility: 1 test.
- A direct verifier probe accepted a PNG signature plus IHDR-only payload with no CRC, IDAT, or IEND chunks.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Image verification accepts truncated, non-decodable image payloads

**Classification:** BLOCKER

**File:** `apps/api/src/asset-content-verifier.ts:77-103, 122-148`

**Issue:** The direct-upload completion path now hashes and inspects object bytes, but `verifyPng` accepts a PNG containing only the signature and IHDR fields; it does not verify the IHDR CRC, require an IDAT chunk, or require IEND. `verifyJpeg` similarly returns as soon as it sees a start-of-frame marker without requiring a scan or end marker, and `verifyWebp` does not validate RIFF/chunk boundaries. The verifier therefore marks malformed bytes as a verified image. A direct runtime probe of a 33-byte signature-plus-IHDR-only PNG returned `{ width: 1, height: 1 }`. Cinematic-reference resolution can then issue a provider URL for this malformed media; the provider, rather than MovPrompt, discovers the defect after an attempted render.

**Fix:** Use a real bounded image decoder for JPG/PNG/WebP (or pass the bounded source through FFmpeg/ImageMagick and verify a decoded frame) before `updateVerifiedImage`/claim completion. Preserve the checksum and dimension checks, but require complete decodability. Add direct-upload and mirrored-image tests for an IHDR-only PNG, SOF-only JPEG, and truncated WebP, all expecting `422 invalid_asset_content`.

### CR-02: Selected presenters are authorised but never sent to the rendering pipeline

**Files:** `apps/web/src/features/create/projectStore.ts:175-191`, `apps/api/src/campaign-eligibility.ts:91-145`, `apps/worker/src/render-lifecycle.ts:960-1011`

**Issue:** Template Mode persists the selected `presenter` only inside `templateQuoteContext`/campaign recipe. The server correctly validates its eligibility, but `buildPortableGenerationConfiguration` deliberately excludes footage from `generation.references`, and the worker creates `ProviderGenerationRequest` from only `configuration.references`, prompt, audio, duration, ratio, and resolution. It never reads or maps `presenter` or an uploaded spokesperson asset into a provider request. AI UGC has the same issue: the `presenter.ai_ugc` capability is checked only for eligibility while the render itself uses the video capability. Consequently, a user can select “AI UGC presenter” or “Uploaded spokesperson,” receive a quote, and pay for a render in which that selected presenter has no pipeline effect.

**Fix:** Either implement an explicit provider-backed presenter contract end to end (including a server-owned cast/avatar reference or verified footage-reference role and provider capability), or remove/disable both presenter modes in Template Mode until the pipeline supports them. Add integration tests proving that a selected supported presenter produces the expected provider request, and that unavailable presenter plumbing rejects quote/start before any charge or provider submission.

---

_Reviewed: 2026-08-21T02:01:00+03:00_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
