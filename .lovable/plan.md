## Goal

Replace the single "Storyboard" category with two distinct, more guided workflows:

1. **Multi-Angle** — from one anchor image, render **6 separate panels** showing the same subject + scene from 6 different camera angles. Nothing else changes (wardrobe, lighting, props, background all locked).
2. **Storyboard (story-driven)** — user writes a short story / logline, picks **3 / 6 / 9 shots**, the Director shapes a per-shot plan ("pro replay" with action, framing, lens, lighting, mood), shows it in a **plan card** for review/edit/approve, then renders. After render, every panel keeps a per-shot **Regenerate** control.

## UX flow

### Category strip (chat composer)
```text
Cinema   UGC   Multi-Angle   Storyboard   Animate
```
- `Storyboard` chip replaced by two: `Multi-Angle` and `Storyboard`.
- Each gets its own tagline + starter prompts.

### Multi-Angle
1. User picks the chip → composer shows "Drop or pick the anchor image" + a short caption field ("anything to emphasize? optional").
2. If no subject is locked yet, reuse existing subject-lock flow first.
3. On send, Director calls `generate_reference_image` with new `mode: "multi_angle"`, `per_shot_prompts` = 6 angle beats (front, 3/4 left, profile left, back, profile right, low/hero), `reference_urls` = anchor + locked sheet.
4. Edge function generates **6 independent panels** (same chained pipeline already used for storyboard, but with `panel_count = 6`, aspect from the anchor, no story preamble). Each panel returns to the rail tagged `role: "multi_angle"` and gets a per-panel Regenerate.

### Storyboard (story-driven)
1. User picks the chip → composer expands into a small inline form:
   - **Story** textarea (logline or short paragraph; examples chips: "30s product launch", "character morning routine", "before/after transformation").
   - **Shot count** segmented: `3 · 6 · 9` (default 6, persisted to `localStorage`).
   - Optional **Location** and **Tone** chips (skippable).
2. On send, the Director (existing `director-agent`) is asked via a new tool call `plan_storyboard` to return a structured plan: shared style preamble + N shot beats (title, action, shot type, camera move, lens, lighting, mood) + a one-line shot-to-shot grammar note. **No image generation yet.**
3. Plan renders as a new chat bubble: **`StoryboardPlanCard`**
   - Header: grammar note + shot count selector (lets user bump 3↔6↔9 and re-ask the Director).
   - Each shot row: editable title + beat (textarea), small chips showing lens/lighting/mood (also editable), `Rewrite with AI` button (re-asks the Director for that single beat), `Delete shot`.
   - Footer: `Add shot`, `Approve & generate panels` (primary), `Discard`.
4. On approve, client calls `generate_reference_image` with `mode: "storyboard_panels"`, `per_shot_prompts` = the approved beats, same locked references — existing pipeline.
5. After render, each panel in the rail / chat keeps the existing per-panel **Regenerate** path (already present for shot_index regen). We surface it more prominently with a tooltip and a "Rewrite beat" submenu that opens the plan card pre-scoped to that one shot.

## Technical breakdown

### Frontend
- **`DirectorChat.tsx`**
  - `CATEGORIES`: replace the single `storyboard` entry with `multi_angle` and `storyboard` entries (icons: `Orbit` for multi-angle, keep `LayoutGrid` for storyboard).
  - New state: `storyboardShotCount` (3/6/9, persisted as `director:storyboard_shots`), `storyboardDraftPlan` (the unapproved plan), `multiAngleAnchorUrl`.
  - When `activeCategory === "storyboard"`, render `<StoryboardComposerForm />` inside the composer area (story textarea + 3/6/9 + chips).
  - When `activeCategory === "multi_angle"`, render `<MultiAngleComposerForm />` (anchor preview + optional note).
  - Wire approval → `runReferenceGeneration` with the approved `per_shot_prompts`.
- **New `src/components/director/StoryboardPlanCard.tsx`** — renders the editable plan, calls `onRegenerateBeat(shotIndex)` and `onApprove(plan)`.
- **New `src/components/director/MultiAnglePresetBeats.ts`** — exports the 6 canonical angle beats (front, 3/4 L, profile L, back, profile R, low hero) parameterised by subject_kind (character vs product).
- **`Composer.tsx`** — accepts an optional `slotBelow` render prop for the inline category forms; no other changes besides existing 1K/2K/4K picker.
- **`GeneratedImageCard.tsx`** — when `role === "storyboard"` or `role === "multi_angle"`, show a `Rewrite shot` action that opens the plan card scoped to that shot (storyboard) or replaces just that angle (multi-angle).

### Backend
- **`supabase/functions/director-agent/index.ts`**
  - Extend the `generate_reference_image` tool enum: `mode: "character_sheet" | "storyboard_panels" | "single_panel" | "multi_angle"`.
  - Add a new tool `plan_storyboard` (no image gen) — returns `{ shared_style, grammar_note, shots: [{title, beat, shot_type, camera_move, lens, lighting, mood}] }`. Used so the user can review before paying credits.
  - Update prompts/rules to: when the user provides a story + shot count, call `plan_storyboard` first and wait for client approval before calling `generate_reference_image` with `storyboard_panels`. When the user asks for "multi-angle of this", call `generate_reference_image` directly with `mode: "multi_angle"`.
- **`supabase/functions/generate-reference-image/index.ts`**
  - Accept `mode: "multi_angle"`. Behaves like `storyboard_panels` (chained per-shot generation, same upscale + quality + credit logic) but:
    - `panel_count = 6` fixed.
    - Prompt builder injects an **angle-only lock**: "Identical subject, wardrobe, lighting, props, background as the reference. Only the camera angle changes. No new action, no new objects." + the per-angle beat.
    - Aspect ratio inherits from the anchor image.
  - For `storyboard_panels`, accept `panel_count: 3 | 6 | 9` (existing default stays 9, new path passes explicit value).
- **No DB schema changes.** Plans live in chat state only; approved generations already persist via `generation_events`.

### Credits
- Multi-angle = 6 panels × current per-panel cost + selected quality upscale (reuses `priceFor` path already added for 4K).
- `plan_storyboard` is a text-only LLM call → charged as a small reasoning call (~1 credit) so users aren't blindsided if they iterate.

## Out of scope
- Saving named storyboard plans / templates.
- Multi-character scene blocking inside a single panel.
- Video generation from approved storyboard (already its own animate flow).
- Re-ordering shots via drag (Add / Delete only in v1).

## Files touched
- `src/components/director/DirectorChat.tsx` (categories, state, plan handling)
- `src/components/director/Composer.tsx` (slot for inline forms)
- `src/components/director/GeneratedImageCard.tsx` (Rewrite shot affordance)
- new `src/components/director/StoryboardPlanCard.tsx`
- new `src/components/director/StoryboardComposerForm.tsx`
- new `src/components/director/MultiAngleComposerForm.tsx`
- new `src/lib/director/multiAngleBeats.ts`
- `src/lib/director/api.ts` (types for `multi_angle`, `plan_storyboard`)
- `supabase/functions/director-agent/index.ts` (tools + rules)
- `supabase/functions/generate-reference-image/index.ts` (multi_angle branch + panel_count)
