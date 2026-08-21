---
phase: 03
slug: product-and-service-golden-paths
status: needs_human_review
audited: 2026-08-21
baseline: 03-UI-SPEC.md
screenshots: not-captured-no-local-browser-surface
---

# Phase 03 — UI Review

**Audited:** 2026-08-21  
**Baseline:** Approved [`03-UI-SPEC.md`](03-UI-SPEC.md) and Phase 03 context, plans, and summaries.  
**Screenshots:** Not captured. No local application responded on ports 3000, 5173, 8080, or 8081. The checked-in browser evidence also records the full rendered matrix as **NOT VERIFIED**. This is a code-led audit, not visual acceptance.

## UX and visual brief used for review

- **User:** Kuwait business owner with no prompt, model, timeline, or editing knowledge.
- **Primary job:** Add a real product/service, confirm the facts, choose an outcome/template, then create a campaign without re-entering data.
- **Experience bar:** A calm media-led creator with one obvious next action, not a dashboard or a technical tool.
- **Key anxiety:** The result could use the wrong facts/media, lose work, or conceal price/availability.

---

## Pillar Scores

| Pillar | Score | Key finding |
|---|---:|---|
| 1. Copywriting | 2/4 | Core recovery copy is strong, but Arabic campaign controls retain English CTA choices and Template Mode advertises prompts. |
| 2. Visuals | 2/4 | The intended editorial/media-led hierarchy exists in CSS, but no current rendered desktop/mobile/RTL/theme evidence proves its execution. |
| 3. Color | 3/4 | Semantic creator tokens and a restrained amber action path are largely consistent; hardcoded media/theme values and unverified contrast prevent a full pass. |
| 4. Typography | 1/4 | New Phase 03 surfaces use 700/800 weights and several non-contract text sizes despite the approved 400/600 type rule. |
| 5. Spacing | 2/4 | Layout is responsive in code, but new surfaces repeatedly use one-off 6/9/10/12/14/17/18/20/22/28px measurements outside the approved scale. |
| 6. Experience Design | 1/4 | State coverage is thoughtfully coded, but the end-to-end browser/auth/quote flow and all required viewport/keyboard/RTL/theme evidence remain unobserved. |

**Overall: 11/24**

> `needs_human_review`: Phase 03's release evidence says both the provisioned UAT and rendered browser matrix are NOT VERIFIED. This is a release blocker, not a documentation gap.

---

## Top 3 Priority Fixes

1. **Run and capture the real creator matrix before release** — without observed source → facts → outcome → template → setup → review → Generate/auth states, the Kuwait-first beginner flow cannot be approved for responsive, RTL, focus, dialog, or error-recovery quality. Start the provisioned stack and capture 375/768/1024/1440 in English/light and Arabic/dark; complete both product and service flows, keyboard-only traversal, dialog focus return, reduced motion, console/network checks, and quote/retry states. Update [`03-BROWSER-EVIDENCE.md`](03-BROWSER-EVIDENCE.md) and [`03-UAT-EVIDENCE.md`](03-UAT-EVIDENCE.md) with redacted evidence.
2. **Bring Phase 03 typography and spacing back to the approved token contract** — mixed 700/800 weights and bespoke measurements create visual drift. Restrict new components to 400/600, map padding/gaps to 4/8/16/24/32/48/64px tokens, and expose exceptions only for documented 44px targets/header/sticky bar.
3. **Finish Arabic and Template-Mode content integrity** — Arabic users see English CTA choices and Template Mode tells beginners about “prompts”. Translate campaign CTA options and change the Advanced invitation to outcome-oriented language such as “Use references and detailed creative controls”.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

**WARNING — Arabic campaign setup contains untranslated CTA options.**

- Evidence: [`CampaignSetupStep.tsx:27`](../../../../apps/web/src/features/create/CampaignSetupStep.tsx:27) defines `Shop now`, `Order on WhatsApp`, `Book now`, `Learn more`, and `Visit store` only in English; [`CampaignSetupStep.tsx:124`](../../../../apps/web/src/features/create/CampaignSetupStep.tsx:124) renders those values directly even when `arabic` is true.
- Impact: The main Arabic campaign configuration control becomes mixed-language without intentional bilingual treatment, contradicting the independent Arabic UI/campaign-language and RTL contract.
- Fix: Model CTA options as localized `{ value, en, ar }` records, preserve the stable value in the draft, render `ar` for an Arabic UI, and add Arabic/English/bilingual tests.

**WARNING — Template Mode exposes internal creative-tool vocabulary.**

- Evidence: [`CreateStudio.tsx:1678`](../../../../apps/web/src/features/create/CreateStudio.tsx:1678) tells users switching from the beginner flow: “Use prompts, references and detailed render controls.”
- Impact: The approved copy contract excludes prompt/model/render-settings language from Template Mode. It is especially confusing for the no-video-knowledge primary user.
- Fix: Retain the secondary Advanced entry point but use business-facing language, for example “Use references and detailed creative controls,” and keep technical terms inside Advanced only.

**WARNING — source link validation is not programmatically attached to the actual field.**

- Evidence: [`SourceChoiceStep.tsx:170-187`](../../../../apps/web/src/features/create/SourceChoiceStep.tsx:170) sets `aria-describedby` on the wrapper, not the input, and the input does not expose `aria-invalid` when `error` is present; the alert is separate at [`SourceChoiceStep.tsx:235-244`](../../../../apps/web/src/features/create/SourceChoiceStep.tsx:235).
- Impact: A screen-reader user landing in the URL field is not told it is invalid or connected to the recovery text.
- Fix: Place `aria-invalid={Boolean(error)}` and `aria-describedby` on `#source-url`; include help plus error IDs when both are present.

Positive evidence: Source, facts, quote, rights, and authentication recovery copy is concrete and preserves the draft.

### Pillar 2: Visuals (2/4)

**WARNING — visual quality is unproven at every required viewport/theme/locale.**

- Evidence: [`03-BROWSER-EVIDENCE.md`](03-BROWSER-EVIDENCE.md) reports 375, 768, 1024, and 1440 as “Not observed”; live port probing in this audit found no responding web server.
- Impact: CSS intent cannot validate clipping, sticky-action overlap, media crop quality, card density, actual contrast, or whether the next action is understandable within five seconds.
- Fix: Treat the browser matrix as a release gate. Attach redacted screenshots or recorded browser notes for both golden paths and inspect actual loaded fonts/media, not only DOM tests.

**WARNING — the active creator mixes the new focused flow with legacy editor/workspace CSS in one stylesheet.**

- Evidence: [`creator.css:1-1141`](../../../../apps/web/src/features/create/creator.css:1) combines creator shell, catalog, editor, Advanced studio, and export styling; Phase 03 begins at [`creator.css:1143`](../../../../apps/web/src/features/create/creator.css:1143).
- Impact: Unrelated cascade rules can affect the beginner creator and cannot be ruled out without rendered testing.
- Fix: Isolate the creator-flow styles under a scoped layer/module or document clear ownership boundaries. Keep shared semantic tokens, but avoid dependence on distant legacy cascade order.

Positive evidence: Source cards, fact review, recommendation cards, and the six-group final review compose as an editorial, media-led flow in code; selected draft media is used rather than a sample asset.

### Pillar 3: Color (3/4)

**WARNING — token discipline is mostly good but incomplete.**

- Evidence: Semantic light/dark creator variables are defined in [`creator.css:1-31`](../../../../apps/web/src/features/create/creator.css:1), and action/selection/focus states use `--creator-action`. Media/editor surfaces add hardcoded `#111114`, `#0d0d0f`, `rgba(255,255,255,.72)`, and black shadows at [`creator.css:579`](../../../../apps/web/src/features/create/creator.css:579) and [`creator.css:616`](../../../../apps/web/src/features/create/creator.css:616); catalog accent data also uses literal hex values in [`templates.ts:6`](../../../../apps/web/src/features/create/templates.ts:6).
- Impact: Light/dark media treatment can drift from the semantic system, and contrast has not been observed.
- Fix: Make media-frame foreground/background/shadow values semantic tokens with an intentional dark-preview exception; run contrast checks on real light/dark surfaces.

Positive evidence: Amber is not sprayed across every surface. It identifies primary actions, selected choices, active progress, and focus, fitting the approved 60/30/10 distribution.

### Pillar 4: Typography (1/4)

**BLOCKER — new Phase 03 typography violates the approved 400/600-only contract.**

- Evidence: The contract limits new Phase 03 surfaces to regular 400 and semibold 600. New CSS applies `font-weight: 700` to source/fact labels at [`creator.css:442`](../../../../apps/web/src/features/create/creator.css:442), [`creator.css:465`](../../../../apps/web/src/features/create/creator.css:465), buttons at [`creator.css:510`](../../../../apps/web/src/features/create/creator.css:510), campaign summary at [`creator.css:1149`](../../../../apps/web/src/features/create/creator.css:1149), and `800` to campaign/review index circles at [`creator.css:1152`](../../../../apps/web/src/features/create/creator.css:1152) and [`creator.css:1201`](../../../../apps/web/src/features/create/creator.css:1201).
- Impact: It breaks the approved premium editorial hierarchy and risks excessive visual density, particularly in Arabic.
- Fix: Map headings/labels/actions to 600 and ordinary supporting copy to 400; verify actual Inter/Noto Sans Arabic font loading in both locales.

**WARNING — Phase 03 type sizes are not constrained to the contract roles.**

- Evidence: The contract names 12/16/24/48px roles, but new surfaces introduce 10, 11, 13, 14, 15, 17, 20, 22, 25, and 28–38px at [`creator.css:364-374`](../../../../apps/web/src/features/create/creator.css:364), [`creator.css:430-470`](../../../../apps/web/src/features/create/creator.css:430), and [`creator.css:1146-1165`](../../../../apps/web/src/features/create/creator.css:1146).
- Fix: Define and approve an expanded semantic scale first, then use roles rather than raw sizes.

### Pillar 5: Spacing (2/4)

**WARNING — new Phase 03 surfaces repeatedly bypass the approved spacing scale.**

- Evidence: The contract permits 4/8/16/24/32/48/64px. New flow CSS uses `9px`, `10px`, `12px`, `14px`, `17px`, `18px`, `20px`, `22px`, and `28px` in [`creator.css:365-376`](../../../../apps/web/src/features/create/creator.css:365), [`creator.css:429-471`](../../../../apps/web/src/features/create/creator.css:429), and [`creator.css:1144-1180`](../../../../apps/web/src/features/create/creator.css:1144).
- Impact: Spacing rhythm becomes implementation-specific instead of reusable, making the creator feel denser than the approved calm-session design.
- Fix: Introduce named CSS custom properties for the approved scale and replace new raw values. Preserve documented target/header/sticky exceptions only.

**needs_human_review — mobile sticky actions cannot be accepted from CSS alone.**

- Evidence: Setup and review actions become sticky under 800px at [`creator.css:1214-1220`](../../../../apps/web/src/features/create/creator.css:1214), while the browser matrix has no observed 375px state.
- Impact: The sticky bar can cover field errors, browser controls, or final review content—the exact UI-spec backstop.
- Fix: Inspect long Arabic values and validation errors at 375px with browser safe-area emulation; add end-padding/scroll-margin protections if content is hidden.

### Pillar 6: Experience Design (1/4)

**BLOCKER — the required real beginner journey is not evidenced in a browser or provisioned stack.**

- Evidence: [`03-UAT-EVIDENCE.md`](03-UAT-EVIDENCE.md) records missing Mailpit, worker heartbeat/paused queue, authenticated claim/checksum, quote, and durable run. [`03-BROWSER-EVIDENCE.md`](03-BROWSER-EVIDENCE.md) records no observed browser matrix. The UI correctly fails closed when quotes are unavailable, but that prevents observed review → auth handoff.
- Impact: The core product promise—configure first, authenticate only at Generate, return to the exact campaign—cannot yet be accepted as working.
- Fix: Provide a disposable healthy stack with fake/paused provider dispatch, authoritative quote, email delivery, and browser automation. Exercise product link/upload and business link/manual through auth cancel/replay, quote retry/expiry, and recovery without paid generation.

**WARNING — failure-state coverage is substantial but not fully observable or screen-reader complete.**

- Evidence: Source loading/error, fact validation, quote state, rights, auth dialog, and reduced-motion rules are implemented in `SourceChoiceStep`, `CampaignSetupStep`, `CampaignReviewStep`, and [`creator.css:1139-1140`](../../../../apps/web/src/features/create/creator.css:1139). The source input error association is missing, no observed dialog trap/focus return exists, and no 375px sticky validation exists.
- Fix: Add focused accessibility tests for source-error linkage and browser/axe coverage for modal focus return, radio arrow keys, selection state, exact Arabic LTR values, quote retry, and no horizontal overflow.

**WARNING — recommendation cards describe presenter support generically, not actual availability.**

- Evidence: [`TemplateRecommendationCards.tsx:158`](../../../../apps/web/src/features/create/TemplateRecommendationCards.tsx:158) always says “No presenter or template-supported,” while real eligibility is determined later by server-projected compatibility in [`PresenterChoice.tsx:48-113`](../../../../apps/web/src/features/create/PresenterChoice.tsx:48).
- Impact: Users can infer an AI/uploaded presenter is available, then learn later it is not; this conflicts with the truthful presenter contract.
- Fix: Pass the eligibility projection into recommendation cards and render the exact state, such as “No presenter available for this campaign” or “Uploaded spokesperson available with verified footage”.

Positive evidence: Native radio/checkbox controls, visible labels, 44px primary targets, logical CSS properties, draft-preserving recovery copy, focus-return plumbing, and reduced-motion overrides are present in implementation. These remain implementation signals until browser observation.

---

## Registry Safety

`components.json` is absent and [`03-UI-SPEC.md`](03-UI-SPEC.md) declares no third-party registry blocks for Phase 03. No registry audit was applicable.

---

## Files Audited

- `.planning/phases/03-product-and-service-golden-paths/03-CONTEXT.md`
- `.planning/phases/03-product-and-service-golden-paths/03-UI-SPEC.md`
- `.planning/phases/03-product-and-service-golden-paths/03-01-PLAN.md` through `03-08-PLAN.md`
- `.planning/phases/03-product-and-service-golden-paths/03-01-SUMMARY.md` through `03-08-SUMMARY.md`
- `.planning/phases/03-product-and-service-golden-paths/03-BROWSER-EVIDENCE.md`
- `.planning/phases/03-product-and-service-golden-paths/03-UAT-EVIDENCE.md`
- `apps/web/src/features/create/{SourceChoiceStep,FactReviewStep,OutcomeStep,TemplateRecommendationCards,CampaignSetupStep,PresenterChoice,CampaignReviewStep,AuthGateDialog,CreatorShell,CreateStudio}.tsx`
- `apps/web/src/features/create/creator.css`

## Verification Limitation

`needs_human_review`: No actual local browser/runtime was available during this audit. Scores intentionally do not infer visual, keyboard, contrast, overflow, or end-to-end truth from source code and component tests.
