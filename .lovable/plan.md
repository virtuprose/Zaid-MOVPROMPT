## Goal

Let the user pick the output resolution (**1K / 2K / 4K**) up front — both in the Director chat composer (applied to every image the agent generates) and in the ImageEditorDialog (applied to the edit being produced) — instead of only inside the aspect_choice bubble.

## UX

### 1) Chat composer

- Add a compact segmented control `1K · 2K · 4K` in the Composer's bottom toolbar, next to the mode switch (Director / Chat) and Send button. Same visual language as the existing chips: rounded pill, primary tint when active.
- Tooltip on 4K: "+3 credits per image".
- The selected value is sticky across the session and persisted in `localStorage` (`director:image_quality`, default `1K`).
- This becomes the default quality for any image generation kicked off from the chat — single panel, character/product sheet, and storyboard panels.
- The existing `AspectChoiceCard` (aspect bubble) still appears, but its quality row is **pre-seeded** with the composer's current choice so the user doesn't have to repick. They can still override per bubble.

### 2) ImageEditorDialog

- Add the same `1K / 2K / 4K` segmented control above the "Generate edit" button.
- Cost label updates live:
  - 1K / 2K → `~5 credits`
  - 4K → `~8 credits (5 + 3 upscale)`
- Default to the composer preference on open.

## Files

**Frontend**
- `src/components/director/Composer.tsx` — add `quality` + `onQualityChange` props and render the segmented control in the existing toolbar row.
- `src/components/director/DirectorChat.tsx`
  - New state `chatImageQuality` (hydrated from `localStorage`, persisted on change).
  - Pass it to `<Composer />`.
  - In `runReferenceGeneration(...)`, when `payload.quality` is not explicitly set by the caller (most paths today), fall back to `chatImageQuality` instead of the hard-coded `"1K"`.
  - Pre-seed `<AspectChoiceCard defaultQuality={chatImageQuality} />` so the bubble's initial pick matches.
- `src/components/director/AspectChoiceCard.tsx` — accept optional `defaultQuality` prop; use it as the initial `useState` value.
- `src/components/director/ImageEditorDialog.tsx`
  - Add `quality` state (default = composer pref via a small `localStorage` read, fallback `"1K"`).
  - Render the segmented control + dynamic cost label.
  - Pass `quality` into `editImage(...)`.

**Shared client lib**
- `src/lib/director/editImage.ts` — extend the `editImage` params with `quality?: "1K" | "2K" | "4K"`, forward as `quality` in the edge-function body.

**Edge function**
- `supabase/functions/generate-reference-image/index.ts`
  - Edit branch (`op === "edit"`): read `quality` from the body, default `"1K"`.
  - After the base edit returns, run the same upscale path the generation flow already uses for 4K (or 2K free upscale). For 4K charge an additional `priceFor("image_upscale_4k", 3)` credits, with refund on failure — mirror the existing storyboard 4K handling so behavior stays consistent.
  - Echo the chosen quality in the response payload so the client can label the new bubble.

## Out of scope

- Per-model quality caps (Nano Banana 2 supports up to 4K via upscale — keep the same three tiers everywhere).
- Backfilling existing rendered images with a new resolution.
- Adding 8K or other tiers.

## Technical notes

- 4K pricing surcharge already lives in `AspectChoiceCard` as `QUALITY_4K_CREDITS_PER_PANEL = 3`. Reuse the same constant from the composer / editor so all three surfaces stay in sync (export it or move to `src/lib/credits/pricing.ts`).
- `runReferenceGeneration` already computes `upscaleCost = quality === "4K" ? UPSCALE_4K_PER_PANEL * imageCount : 0` — only the **source** of `quality` changes (composer state instead of hardcoded `"1K"`).
- Persist key: `localStorage["director:image_quality"]`. Read once on mount with a safe try/catch.