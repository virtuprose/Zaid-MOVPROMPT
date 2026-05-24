# Prompt Inspector (read-only)

Goal: from any storyboard panel (and single-frame / character-sheet bubbles), expand a small inspector that shows the **exact composed prompt** the edge function sent to the image model, plus the references and metadata used. Copy button on the prompt. No editing, no regen-from-inspector — defer those.

## Why this scope

The bubble payload already carries every input the edge function used (`per_shot_prompts`, `style_spec`, `aspect_ratio`, `lock_mode`, `reference_urls`, `subject_kind`). The only thing missing client-side is the **final composed string** — the LOCKED STYLE header, lock prefix, continuity clause, aspect clause, and PANEL_POLISH_SUFFIX that the edge function wraps around each beat. We mirror that composition in a tiny client helper so the inspector shows the real text without a backend change.

## Build

### 1. New util: `src/lib/director/composePromptPreview.ts`

Pure function that mirrors the string-building in `supabase/functions/generate-reference-image/index.ts` (the `buildStyleHeader`, `buildAspectClause`, `IDENTITY_LOCK`, `SCENE_LOCK`, `HERO_FRAME_SUFFIX`, `PANEL_POLISH_SUFFIX`, continuity clause, subject clause logic).

```ts
type Args = {
  mode: "character_sheet" | "storyboard_panels" | "single_panel";
  beat: string;              // the per-shot beat or basePrompt
  shotIndex?: number;        // 1..N for storyboard_panels
  totalShots?: number;       // N for storyboard_panels
  styleSpec?: StyleSpec;
  lockMode?: "character" | "scene" | "auto";
  hasReference: boolean;     // referenceUrls.length > 0
  multiRef: boolean;         // referenceUrls.length >= 2
  isChain: boolean;          // storyboard_panels && !regenIndex
  aspectRatio: "1:1" | "16:9" | "9:16";
  subjectKind?: "character" | "product";
};
export function composePromptPreview(a: Args): string;
```

Top of file has a comment: "MUST stay in sync with supabase/functions/generate-reference-image/index.ts prompt composition. If you change one, change both."

### 2. New component: `src/components/director/PromptInspector.tsx`

A `Popover` (matches existing chrome — same component used elsewhere in the card) triggered by a small "i" / `FileText` icon button in each panel's hover overlay and in the sequence footer.

Contents (no editing):
- **Composed prompt** — pre-wrapped, monospace, ~12px, max-height with scroll, copy button (uses `navigator.clipboard.writeText`, shows toast on success).
- **Inputs** — compact key/value list: mode, shot N of M, aspect, lock_mode, subject_kind, style_spec fields (lens, lighting, palette, film_emulation, grade, mood).
- **References** — bullet list of reference URLs with their role labels (`sticky`, `scene anchor`, `extra`) inferred the same way the edge function does (`[0]=sticky`, `[1]=anchor`, rest=extras). Each URL is a small "open" link (target=_blank).

No accordion, no tabs — one popover, three sections stacked.

### 3. Wire into `GeneratedImageCard.tsx`

- New prop on the card (optional): `inspectorContext?: { styleSpec?, lockMode?, referenceUrls?, perShotPrompts?, basePrompt?, subjectKind? }`. Passed by `DirectorChat` from the bubble payload it already stores.
- Per-panel button: `<FileText>` icon in the same hover overlay as the existing Play/Regen buttons (storyboard_panels mode only, and single_panel/character_sheet too — same component renders all three).
- Sequence footer: a `Inspect prompts` ghost button next to `Regenerate all panels` / `Re-light all panels` that opens a popover listing all N panels with click-to-expand. Or simpler v1: only per-panel inspector, skip the sequence-wide one. **Pick per-panel only for v1.**

### 4. Wire context in `DirectorChat.tsx`

The image bubble messages already carry `per_shot_prompts`, `style_spec`, `shot_index`, etc. Pass them down as the new `inspectorContext` prop on every `<GeneratedImageCard />` render.

## Out of scope

- No edit-and-regen from inspector
- No edge function changes, no DB changes
- No sequence-level "diff all prompts" view
- No video-prompt inspector (separate pass when Layer 4 lands)

## Verification

1. Open an existing storyboard session. Click the inspector icon on panel 3.
2. Confirm the composed string starts with `LOCKED STYLE — lens … grade …` (if style_spec set), then `Same character as the attached reference image…` (or `Same scene…` for chain panels), then `Shot 3 of 6: <beat>`, then continuity + subject clauses, then ` Frame composed for 16:9 …`, then the polish suffix.
3. Cross-check against the edge function source — strings should be byte-identical.
4. Copy button puts the same string on the clipboard.
5. References section shows the panel's signed URLs in correct role order.
6. Open a single-frame bubble and a character-sheet bubble — inspector still renders, branch logic picks the right template.

## Files touched

- new: `src/lib/director/composePromptPreview.ts`
- new: `src/components/director/PromptInspector.tsx`
- edit: `src/components/director/GeneratedImageCard.tsx` (icon button + popover mount + new prop)
- edit: `src/components/director/DirectorChat.tsx` (pass `inspectorContext` from bubble payload)
