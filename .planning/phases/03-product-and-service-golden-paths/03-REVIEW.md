---
phase: 03-product-and-service-golden-paths
reviewed: 2026-08-20T21:21:15Z
depth: standard
files_reviewed: 50
files_reviewed_list:
  - apps/api/src/campaign-eligibility.ts
  - apps/api/src/generation-repository.ts
  - apps/api/src/generation-routes.ts
  - apps/api/src/generation-service.test.ts
  - apps/api/src/generation-service.ts
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
  - apps/web/src/features/create/portableProjectMapper.ts
  - apps/web/src/features/create/projectStore.ts
  - apps/web/src/features/create/sourceFacts.ts
  - apps/web/src/features/create/templateQuoteState.test.ts
  - apps/web/src/features/create/templateQuoteState.ts
  - apps/web/src/features/create/templateRecommendations.test.ts
  - apps/web/src/features/create/templateRecommendations.ts
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
  warning: 5
  info: 0
  total: 8
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-08-20T21:21:15Z  
**Depth:** standard  
**Files Reviewed:** 50  
**Status:** issues_found

## Summary

The Phase 3 implementation has solid owner-scoped repository patterns, quote hashing, and a fail-closed generation API. However, the user-visible source paths do not all reach that protected pipeline. Three defects prevent promised creation journeys from being correct: local video/footage uploads cannot be claimed, manual campaigns are blocked despite completing their required facts, and a WhatsApp number can satisfy a booking-only template requirement server-side.

The provided UAT summaries honestly record that provisioned browser and real-stack evidence is still unavailable; this review does not classify that missing evidence itself as a code defect.

## Critical Issues

### CR-01: Accepted footage uploads cannot complete secure claim or reach generation

**Classification:** BLOCKER  
**File:** `apps/web/src/features/create/CreateStudio.tsx:210-216, 813-860, 1085-1112`  
**Issue:** The source UI explicitly accepts MP4 and MOV uploads, stores them as `real_footage`, and advertises footage as a valid campaign source. At authentication/claim time, however, every claimable asset is rejected unless its MIME type is JPEG, PNG, or WebP, and every manifest entry is forced to `kind: "product"`. A valid video therefore always fails after the user signs in. Even if that MIME check were removed, the footage contract requires verified `durationMs`, while the manifest never supplies it; the downstream generation reference guard accepts image MIME types only. The flow is consequently not merely untested: it is impossible to complete.

**Fix:** Split image and footage assets in the browser model and guest-claim manifest. Probe video duration before claim, emit `kind: "footage"` with the allowed video MIME, size, checksum, and duration, and extend secure upload/claim mapping to preserve it. Keep footage out of image-only provider references unless the selected capability supports it; use it only for the verified presenter/footage policy when appropriate. Add an integration test that uploads an MP4, performs guest claim, validates the resulting private footage asset, and either generates with a supported flow or returns a truthful capability-specific message.

### CR-02: Manual source campaigns are blocked despite satisfying their stated fact requirements

**Classification:** BLOCKER  
**File:** `apps/web/src/features/create/CampaignReviewStep.tsx:107-109`; `apps/web/src/features/create/CreateStudio.tsx:1190-1194`  
**Issue:** Fact review intentionally allows manual product and service sources to continue once goal-specific facts are present (for example, service name plus booking URL). Final review then unconditionally requires both a product name and at least one image, and `startGeneration` performs the same unconditional image check. A manually entered service campaign with all required booking facts can therefore never generate; it is sent back to Source with an image error. This contradicts the advertised “Enter details manually” source path and makes the UI’s fact validation misleading.

**Fix:** Replace the generic `product.images.length` gate with source/template eligibility that mirrors the server’s required-input policy. Require media only when the selected template/capability actually needs a reference; otherwise allow the valid manual campaign through to the authoritative quote/start flow. Add end-to-end component coverage for a manual service booking campaign and a manual product campaign, plus a negative case for templates that truly require an image.

### CR-03: A WhatsApp number satisfies booking-only template eligibility on the server

**Classification:** BLOCKER  
**File:** `apps/api/src/generation-service.ts:174-176, 225-228`  
**Issue:** `bookingDestination` falls back from `bookingUrl` to `product.whatsapp`, then supplies that value for `booking_destination`, `order_or_booking_destination`, and `delivery_destination`. A direct API client can quote and start a booking-only template with no booking URL at all, simply by supplying a WhatsApp number. This defeats the template’s declared business-fact requirement and permits an incorrect CTA/destination to become a billable campaign.

**Fix:** Model booking, WhatsApp ordering, and delivery destinations separately. `booking_destination` must use only a validated booking URL; allow WhatsApp only for `whatsapp` or an explicitly WhatsApp-compatible `order_or_booking_destination` requirement. Add quote and start-render tests proving that booking templates reject WhatsApp-only configurations.

## Warnings

### WR-01: Campaign setup remains indefinitely in a false “confirming price” state after any edit

**Classification:** WARNING  
**File:** `apps/web/src/features/create/CampaignSetupStep.tsx:39, 44, 47-50, 139-140`  
**Issue:** Every edit sets `localQuoteRefresh` to `true`, but no transition clears it. When the parent receives a new ready quote, `effectiveQuoteState` intentionally converts that ready state back to `loading` forever. The final review may still have a valid quote, but the setup screen continually reports that price confirmation is in progress, which is inaccurate and erodes trust in the price gate.

**Fix:** Associate local refresh state with a configuration/quote key and clear it when the matching quote resolves, or derive the loading display solely from the authoritative quote state. Add a test covering edit → loading → fresh ready quote.

### WR-02: Uploaded spokesperson is permanently hidden even for verified footage and a compatible template

**Classification:** WARNING  
**File:** `apps/web/src/features/create/CreateStudio.tsx:568-590`; `apps/web/src/features/create/PresenterChoice.tsx:113-125`  
**Issue:** The UI always assigns `uploadedSpokesperson: false`, so the exact-footage consent control can never appear in the real create flow. The server-side eligibility service and `PresenterChoice` component support verified footage, but the phase’s advertised presenter option is not reachable. The focused unit test creates a manually verified fixture, so it cannot reveal this integration failure.

**Fix:** Expose a server-projected template/asset compatibility result after claim and use it to enable `uploadedSpokesperson` only when the exact footage is verified and permitted. Add a create-flow test that verifies the control appears for eligible footage and remains absent otherwise.

### WR-03: Guest-local asset IDs remain inside the persisted campaign source after secure claim

**Classification:** WARNING  
**File:** `apps/web/src/features/create/CreateStudio.tsx:840-843, 1143-1149`; `apps/web/src/features/create/portableProjectMapper.ts:19-34`; `apps/web/src/features/create/sourceFacts.ts:152-163`  
**Issue:** Upload creates `source.assetKeys` from IndexedDB-local keys. After claim, image objects are updated with secure `storagePath` values, but the existing `source` object is retained unchanged. `stableProjectConfiguration` subsequently preserves that existing source while removing the local `assetKey` only from the image objects. The saved canonical source therefore contains stale browser-local identifiers rather than the durable object keys it claims to represent, impairing recovery, source provenance, and later source-asset checks.

**Fix:** On a verified claim receipt, rebuild `source.assetKeys` from the exact receipt/secure storage paths before writing a cloud version. Reject or migrate non-storage asset IDs at the persistence boundary. Add a round-trip test from guest upload through claim and cloud hydration that asserts source asset keys equal owned object keys only.

### WR-04: Local fallback templates remain selectable while the published catalog is unavailable

**Classification:** WARNING  
**File:** `apps/web/src/features/create/TemplateGrid.tsx:41-44, 72-85, 100-102, 263-285`  
**Issue:** When Portable Auth is active and the published catalog request fails, the component presents the local fallback catalog as an outage state but leaves every fallback card selectable. That selection can later fail during template-version resolution or quote creation, after the user has configured a campaign. It conflicts with the phase contract that unavailable combinations may be displayed truthfully but must be non-selectable.

**Fix:** Make fallback cards preview-only in portable mode, with a clear retry action and disabled selection until a published template version is available. Preserve the selected published template only when it is already known to be valid. Add a test that catalog failure disables selection and a retry restores it.

### WR-05: Source-selection radio groups are not keyboard-operable as radio groups

**Classification:** WARNING  
**File:** `apps/web/src/features/create/SourceChoiceStep.tsx:112-136, 138-158`  
**Issue:** Buttons are given `role="radio"` inside `radiogroup`, but all remain in the tab order and no Arrow-key/roving-tabindex behavior is implemented. This is not the keyboard interaction required for the ARIA radio pattern, making a core creation decision harder to complete with keyboard-only navigation.

**Fix:** Prefer native radio inputs styled as cards, or implement roving `tabIndex` with Arrow/Home/End keyboard handlers and focus movement. Add keyboard interaction tests for both source and subject groups.

---

_Reviewed: 2026-08-20T21:21:15Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_
