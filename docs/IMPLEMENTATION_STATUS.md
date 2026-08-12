# Rebuild implementation status

Updated: 2026-08-11

The code foundation is implemented, but phase exit gates that require the linked Supabase environment, provider callbacks, payments or production traffic are intentionally not marked complete from local evidence alone.

| Phase | Local implementation | Exit-gate status |
|---|---|---|
| 0 — baseline and architecture | Route baseline, terminology, feature flags and preserved legacy routes documented | Local gate passed |
| 1 — model, pricing and credits | Approved capability registry, public authoritative quote endpoint, starter entitlement, exact charge metadata and idempotent charge/refund RPCs | Awaiting deployed API and two-click concurrency evidence |
| 2 — database and storage | Canonical templates, versions, projects, assets, runs, exports, private buckets, composite ownership constraints and RLS migration | Awaiting migration deployment, generated types and two-user RLS tests |
| 3 — orchestration | Durable start/status/cancel/reconcile operations, reload-safe run IDs and provider-output copying | Awaiting deployed background reconciliation and real provider failure tests |
| 4 — guest/auth handoff | Seven-day IndexedDB drafts/blobs, public hardened scanning, contextual auth gate, stable pending intent, exact same-browser OAuth recovery and checked asset claim | Google/Apple/email callback matrix still requires deployed auth testing |
| 5 — IA and design system | Public Create/Templates/Pricing, shared workspace shell, real credit badge, language control, canonical route additions and compatibility preservation | Account/notification parity and every legacy redirect require production route monitoring |
| 6 — Template Mode | Product-first default, template-first entry, converged campaign review, stable homepage template IDs and twelve-card catalog | Three real template recipes require provider QA after deployment |
| 7 — projects/editor/exports | User-namespaced cache, cloud project/version persistence, URL projects, soft trash, duplicate, editor and honest full-video regeneration disclosure | Deterministic Remotion/FFmpeg overlays, multi-artifact exports and version comparison remain to implement |
| 8 — Advanced Mode | Guest-configurable approved-capability workspace with auth at Generate and cloud run creation; legacy `/ads` remains available | `/ads` parity migration and history consolidation remain to implement |
| 9 — GCC launch | Twelve bilingual GCC template definitions, six markets/currencies, WhatsApp CTA and RTL shell direction | Full interface translation, reviewed Arabic outputs and live checkout remain to implement |
| 10 — release QA | Focused tests, changed-file lint, production build, browser journeys, 375px overflow/touch-target and RTL direction checks | Full security suite, four-viewport matrix, WCAG audit and migration rollback drill remain |

## Verified locally

- `/` starts the public creator without authentication.
- `/create` starts Product as step 1; template links start with the selected template.
- Product → twelve templates → campaign review converges without losing the product.
- Generate is the first authentication gate.
- Guest campaign fields and rights state survive reload through an IndexedDB draft URL.
- The auth modal explains recovery and price confirmation.
- Mobile at 375×812 has no horizontal overflow; tested primary controls are at least 44px high.
- Arabic interface selection sets `lang="ar"` and `dir="rtl"` without horizontal overflow.
- Focused creator tests, focused lint and the production build pass.

## Required deployment order

1. Back up the linked database and apply both `20260811213000` and `20260811214000` migrations in staging.
2. Deploy the capability, quote, generation, cancellation, reconciliation, scraper and updated credit/video functions as one release.
3. Configure the one-minute service-role reconciler schedule.
4. Regenerate database types and run two-user ownership/RLS tests.
5. Run real Seedance success, failure, missing-output, cancel and duplicate-submit cases.
6. Enable the guest creator flag in staging, then execute the OAuth recovery matrix.
7. Keep `/ads`, `/movprompt` and `/library` active until Advanced/Projects parity is demonstrated.
