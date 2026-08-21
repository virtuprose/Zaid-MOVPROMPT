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
- next_action: resolved — retain the strict Template Mode identity and read-boundary checks in future migration and generation reviews
- reasoning_checkpoint: Preserve the existing generic project envelope only where legacy compatibility demands it; security-critical campaign fields must be parsed and normalized server-side without silently dropping unknown values.
- tdd_checkpoint: pending

## Evidence

- timestamp: 2026-08-21T02:40:00+03:00
  observation: GSD security auditor closed 16 of 17 threats and identified T-03-07 as the only blocking high-severity threat.
- timestamp: 2026-08-21T03:55:00+03:00
  observation: The shared strict `CampaignSettingsSchema` and persisted Template Mode payload contract reject unsupported markets, malformed KWD, invalid CTA/booking/WhatsApp/brand values, and hidden keys at claim, version, source replacement, guest claim, quote, and start boundaries.
- timestamp: 2026-08-21T04:10:00+03:00
  observation: Focused contracts, API, generation, browser creator tests, full typechecks/builds, creator smoke tests, and a disposable PostgreSQL 17 migration/API proof passed with no provider calls.
- timestamp: 2026-08-21T04:25:00+03:00
  observation: Re-audit found the initial fix still allowed a narrow bypass: Template Mode writes could omit their immutable template version, and a persisted row or direct estimate could fall back to the generic generation configuration instead of requiring the complete Template Mode campaign payload.
- timestamp: 2026-08-21T05:10:00+03:00
  observation: The second remediation rejects Template Mode without a UUID template version at contract, repository, and PostgreSQL boundaries. Persisted Template Mode quote/start now parses the full payload before template, quote, reference, reservation, or provider work; direct Template estimates use the identical strict payload and reject hidden outer fields.
- timestamp: 2026-08-21T05:15:00+03:00
  observation: Focused and full tests, workspace typechecks/build, creator smoke, lint (warnings only), and disposable PostgreSQL 17 migration/API/worker proofs passed. No paid or provider calls were made.

## Eliminated

## Resolution

- root_cause: Refined: Template Mode identity was inferred from an optional template ID. This left direct estimates and malformed historical rows able to use the generic catchall generation configuration instead of the full immutable Template Mode payload.
- fix: Added `TemplateCampaignWriteSchema` with a required UUID template version, repository revalidation, a PostgreSQL check constraint, explicit `mode` projection, strict persisted/direct Template parsing, and no-fallback rejection before all generation economics or provider-facing work. Advanced Mode remains explicitly separate for supported legacy records.
- verification: Adversarial API/PostgreSQL tests cover absent/null template IDs, guest-claim writes, repository bypasses, missing product recipes, malformed historic Template rows, direct Template estimates, and hidden fields. Focused generation/API tests, full workspace tests, full API/DB/worker tests on a disposable PostgreSQL 17 instance, build/typecheck, creator smoke, lint, and migration/RLS proof passed.
- files_changed: packages/contracts/src/creator.ts, packages/db/src/schema.ts, packages/db/migrations/0020_template_mode_requires_version.sql, packages/db/migrations/meta/_journal.json, apps/api/src/creator-repository.ts, apps/api/src/generation-repository.ts, apps/api/src/generation-service.ts, apps/web/src/features/create/projectStore.ts, apps/web/src/features/create/CreateStudio.tsx, related API/PostgreSQL/web tests, and migration/RLS validation fixtures.
