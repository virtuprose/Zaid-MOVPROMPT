## Goal

Make the Ad video flow in Marketing Studio handle all three input cases cleanly, and warn the user *before* generating when their setup is likely to produce an off-brand / wrong-looking product — without ever blocking them.

## The three cases (all keep working)

1. **Single product photo** — 1 reference image → seedance-2.0 image-to-video (animates the still, highest fidelity to that one frame).
2. **Multi-angle photos** — 2+ reference images → seedance-2.0-ref (identity-locked across angles).
3. **Multi-angle + brand kit** (logo, colors, tagline, etc.) — same multi-ref pipeline, with brand identity injected into the prompt for tone/typography/palette consistency.

Routing logic in `doGenerate` already does this — no change to the provider routing.

## What changes

### 1. New pre-generation "Boost accuracy" dialog

Component: `src/components/marketing/AccuracyBoostDialog.tsx` (new).

Triggered from `handleGenerate` *before* the rights confirmation (or merged into the same flow — see Technical). Only shown when the current setup has a known fidelity risk:

- **Risk A — no reference images at all** (text-only): "The model will invent the product look. Upload a photo for an accurate render."
- **Risk B — logo only, no angle photos** (current `logoOnlyBrand` toast case): "We have your logo but no product photos. Add 1–3 angle photos so the real product appears in the video."
- **Risk C — single angle, no brand kit**: "One angle works, but adding more angles + a brand kit locks the product's shape, color, and packaging across the shot."
- **Risk D — angles present but no brand kit/identity**: soft nudge to add brand identity (colors, tagline) for on-brand styling.

Dialog actions:
- **"Add references"** → closes dialog, opens the relevant editor (Brand Kit editor for A/B/C, Brand Identity sheet for D). User can come back and click Generate again.
- **"Generate anyway"** → proceeds to existing rights confirmation → `doGenerate()`.
- **"Don't show again for this session"** checkbox → stored in `sessionStorage` under `vidoprompt:accuracy-ack`.

The current `toast.warning` for logo-only is removed (replaced by the richer dialog).

### 2. Risk evaluator helper

`src/lib/marketing/accuracyRisk.ts` (new): pure function

```ts
evaluateAccuracyRisk({ subject, brandKits, characterKits, hasLocationImage, brandIdentity }) 
  => { level: 'none'|'low'|'medium'|'high', risks: Risk[], primaryAction: 'add-photos'|'add-brand'|'add-identity'|null }
```

Used both by the dialog and (optionally) for a small inline hint badge near the Generate button so users see the recommendation without needing to click.

### 3. Inline hint near Generate button

Tiny text under/next to "Generate Video" reflecting the highest current risk, e.g. *"Tip: add 2+ angle photos for an accurate product render."* Clicking the tip opens the same dialog. Purely visual nudge — no behavior change.

### 4. Generation flow update in `MarketingStudio.tsx`

`handleGenerate` becomes:
1. Validate format/location (unchanged).
2. Evaluate accuracy risk. If `level >= medium` and not acknowledged this session → open `AccuracyBoostDialog`.
3. On "Generate anyway" → existing rights check → `doGenerate`.
4. Remove the in-`doGenerate` `toast.warning` (now surfaced upfront).

No changes to `doGenerate` body, `composeStudioPrompt`, provider routing, or the edge function. This stays purely a frontend/UX layer.

## Out of scope

- No changes to the video model, prompt composer, or provider routing.
- No mandatory blocking — user can always generate with whatever they have.
- No new database tables.

## Technical notes

- `AccuracyBoostDialog` uses shadcn `AlertDialog` for consistency with `ConfirmRightsDialog`.
- Session-only ack (not persisted to DB) so the nudge returns next session — matches the rights-ack pattern already in the file.
- The "Add references" CTA reuses existing `setBrandEditId` / `setBrandIdentityOpen` setters already in `MarketingStudio.tsx`.

## Files

- **New**: `src/lib/marketing/accuracyRisk.ts`
- **New**: `src/components/marketing/AccuracyBoostDialog.tsx`
- **Edit**: `src/pages/MarketingStudio.tsx` (wire dialog into `handleGenerate`, remove old toast, add inline tip)

## Question for you before I build

The three cases you described all live under the same "Marketing Studio → Generate Video" button today. Do you want me to:
- **(a)** keep it as one flow with the smart pre-generation dialog above (recommended — minimal disruption), or
- **(b)** surface the three cases as explicit choices (e.g. "Quick / Multi-angle / Full brand") in the UI before generating?

I'll go with (a) unless you say otherwise.
