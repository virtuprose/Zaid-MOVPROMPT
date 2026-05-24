## Overlay controls for video presets

Add user control over text + logo overlays inside the existing **Render settings** popover, and feed those choices into the prompt composer so presets stop forcing an end-card when the user doesn't want one.

### 1. Extend `RenderSettings` (`RenderSettingsPopover.tsx`)

Add three new fields:

```ts
export type RenderSettings = {
  aspect_ratio: string;
  resolution: string;
  duration: number;
  overlay_mode: "none" | "endcard" | "lower_third" | "corner" | "center";
  overlay_text?: { headline?: string; cta?: string; price?: string };
  overlay_logo: boolean; // brand wordmark on/off
};
```

Defaults: `overlay_mode: "endcard"`, `overlay_logo: true`, no text. Same look as today.

### 2. UI in the popover

Add two new `Row` entries below Duration:

- **Overlay** — pill row: `None` · `End-card` · `Lower-third` · `Corner` · `Center`. Picking `None` disables the text + logo subsection.
- **Brand logo** — single toggle pill (`On` / `Off`).
- **Text** (collapsible, only when overlay_mode ≠ none) — three compact inputs: Headline, CTA, Price/Offer. Empty = not shown.

Trigger button shows the amber "customized" state if any overlay value differs from default. Keep the same dark popover styling.

### 3. Plumb into the brief

In `MarketingStudio.tsx`, pass overlay values into `composeStudioPrompt` via a new `overlay` field on `StudioBrief`:

```ts
overlay?: {
  mode: "none" | "endcard" | "lower_third" | "corner" | "center";
  logo: boolean;
  headline?: string;
  cta?: string;
  price?: string;
};
```

### 4. Prompt composition (`marketingStudio.ts`)

Two changes:

**a. New `overlayLine(overlay)` helper** that emits an explicit `OVERLAY LOCK` block, e.g.:

- `mode=none, logo=false` → `OVERLAY LOCK — CLEAN RENDER. Do NOT add any end-card, wordmark, logo, on-screen text, captions, or graphic overlays at any point. Product appears unbranded; no visible logos on packaging or labels either.`
- `mode=endcard, logo=true, headline="Made for the bold", cta="Shop now"` → `OVERLAY LOCK — Final beat ends on a clean END-CARD: brand wordmark centered, headline "Made for the bold" above, CTA "Shop now" below, held ~1s then fade. Match brand typography vibe.`
- `mode=lower_third` → text/logo pinned to lower-third over the hero frame, not full end-card.
- `price` → render as a small badge overlay on the product beat.

**b. Strip the forced end-card from presets** when `overlay.mode === "none"` or `overlay.logo === false`.

In `brandLineAt` (lines 629–635), make the "MUST appear visibly as an END-CARD stamp" sentence conditional. When clean mode is on, replace with: `Do NOT render ${tag} anywhere in the frame — no end-card, no packaging, no labels. Use it only as a color/style reference.` Same for `brandIdentityLine` (line 734): drop the "Match the typography vibe for any on-screen text. Honor the logo treatment." sentence when overlays are off.

Also scan the preset `prompt` strings that hardcode `MANDATORY` end-card language (Fashion Dream, Cinematic Fashion Film, Hero Shot — lines 122, 142, 152): when `overlay.mode === "none"`, append a final override line: `OVERRIDE: ignore any end-card / wordmark / logo beat described above. Replace the final beat with a clean hero shot of the product, no graphics, no text.` This is simpler and safer than rewriting each preset.

### 5. Persist with the project

`renderSettings` is already local state in `MarketingStudio.tsx`. No DB change needed — overlay choices ride along in the same object and get serialized into the prompt that's saved with the render.

### Out of scope

- No font picker beyond the existing brand "typography vibe".
- No drag-to-position; placement is preset (center / lower-third / corner).
- No new DB tables or migrations.

### Files touched

- `src/components/marketing/RenderSettingsPopover.tsx` — extend type, defaults, UI rows.
- `src/pages/MarketingStudio.tsx` — pass `overlay` into the brief; show in summary line.
- `src/lib/marketingStudio.ts` — `StudioBrief.overlay`, `overlayLine()`, conditional end-card language in `brandLineAt` + `brandIdentityLine` + `composeStudioPrompt`.
