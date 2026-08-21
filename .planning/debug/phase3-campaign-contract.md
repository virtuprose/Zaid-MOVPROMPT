---
status: resolved
trigger: "Phase 03 security audit found that campaign settings are bounded in the browser but claim/version and generation schemas accept unrestricted JSON."
created: 2026-08-21
updated: 2026-08-21
---

# Phase 3 Campaign Contract

## Symptoms

- **Expected behavior:** Price, offer, CTA, booking URL, WhatsApp, language, Kuwait market, brand fields, and hidden campaign values are validated by one bounded shared contract when written and when read for generation.
- **Actual behavior:** Claim/version `configuration`, `productRecipe`, and `campaignRecipe` accept unrestricted JSON, while the generation configuration has an unbounded catchall.
- **Error:** Security threat T-03-07 remains open; browser-only validation can be bypassed by direct API callers or malicious persisted configuration.
- **Timeline:** Found by the Phase 03 threat audit after the final clean code review on 2026-08-21.
- **Reproduction:** Submit oversized, malformed, unsupported-market, or hidden campaign fields directly to claim/version/generation boundaries and observe schema acceptance.

## Current Focus

- hypothesis: Campaign domain validation was implemented in web-only rules while portable public contracts retained generic JSON for migration compatibility.
- test: Add adversarial contract/API tests for malformed and oversized campaign settings at claim/version write and generation read boundaries.
- expecting: A shared bounded campaign schema rejects invalid settings consistently before persistence, quote, reservation, or provider work while preserving valid Kuwait Arabic/English/bilingual paths.
- next_action: resolved — commit the validated campaign-contract fix and retain this evidence for Phase 03 closeout
- reasoning_checkpoint: Preserve the existing generic project envelope only where legacy compatibility demands it; security-critical campaign fields must be parsed and normalized server-side without silently dropping unknown values.
- tdd_checkpoint: pending

## Evidence

- timestamp: 2026-08-21T02:40:00+03:00
  observation: GSD security auditor closed 16 of 17 threats and identified T-03-07 as the only blocking high-severity threat.
- timestamp: 2026-08-21T03:55:00+03:00
  observation: The shared strict `CampaignSettingsSchema` and persisted Template Mode payload contract reject unsupported markets, malformed KWD, invalid CTA/booking/WhatsApp/brand values, and hidden keys at claim, version, source replacement, guest claim, quote, and start boundaries.
- timestamp: 2026-08-21T04:10:00+03:00
  observation: Focused contracts, API, generation, browser creator tests, full typechecks/builds, creator smoke tests, and a disposable PostgreSQL 17 migration/API proof passed with no provider calls.

## Eliminated

## Resolution

- root_cause: Public draft and project envelopes accepted generic JSON for Template Mode, while generation trusted persisted configuration with a catchall schema. Browser-only bounds could therefore be bypassed before quote, reservation, or provider submission.
- fix: Added one strict Kuwait Template Mode campaign contract and cross-field persisted payload validator. Claim, version, source replacement, guest-claim, quote, and start paths reject malformed, oversized, unsupported, or hidden values with stable errors before persistence or generation economics; a narrowly documented legacy read path exists only for adapters that have no persisted product recipe.
- verification: Contract tests reject malformed KWD, non-KW markets, and unknown keys; API/PostgreSQL tests prove hostile payloads do not persist; generation tests prove hostile stored values cannot reach quote, reference lookup, reservation, or provider work. Full workspace typecheck, build, API/web tests, creator smoke, lint, diff check, and disposable PostgreSQL 17 proof passed.
- files_changed: packages/contracts/src/creator.ts, packages/contracts/src/guest-claims.ts, apps/api/src/creator-repository.ts, apps/api/src/creator-routes.ts, apps/api/src/generation-repository.ts, apps/api/src/generation-service.ts, apps/api/src/generation-routes.ts, the associated contract/API/generation/PostgreSQL/browser tests, and the creator draft mapper/store.
