# Add Style/Realism as 6th Routing Axis

Style genuinely changes which model wins (Kling = photoreal/cinematic, Hailuo = stylized motion, Wan/animatediff = anime, Veo 3 = cinematic-film). Adding it as a first-class routing axis so the Director asks for it, locks it in the spec, and uses it to pick the right engine.

## Scope

**Style values (4):**
- `photoreal` — realistic humans, products, documentary
- `cinematic-film` — graded, anamorphic, film-grain look
- `stylized` — illustrative, painterly, graphic, 3D-render
- `anime` — 2D anime / manga / cel

## Changes

### 1. `supabase/functions/director-agent/index.ts`
- Add **Style** as 6th item under `MODEL-ROUTING QUESTIONS`, after Resolution.
- Update priority order: input → duration → audio → aspect → resolution → **style**.
- Add inferred-skip rules: if user uploads a photo reference, infer `photoreal` unless they say otherwise; if they say "anime/cartoon/3D/painterly", infer that and skip.
- Extend `locked_spec` schema in both `ask_model_choice` and `generate_prompt` tool definitions with `style: "photoreal" | "cinematic-film" | "stylized" | "anime"`.
- Update locked-spec recap format to include style chip, e.g. `"Locked: 15s · 9:16 · SFX · 1080p · photoreal · fresh — ..."`.
- Add per-model style-fit hints to the routing rubric the agent reads (one-liner per model: which styles it nails, which it struggles with).
- Keep per-turn cap at 4.

### 2. `src/lib/director/api.ts`
- Add `style?: string` to the `locked_spec` TypeScript type so it plumbs through.

### 3. `src/components/director/ModelChoiceCard.tsx`
- Add a style chip to `SpecChips` with a small icon (Camera for photoreal, Film for cinematic, Palette for stylized, Sparkles for anime).

### 4. `src/components/director/PromptResultCard.tsx`
- Pass `locked_spec.style` through to the render dialog (no UI change here beyond the existing chips row showing style).

### 5. `src/components/director/VideoOptionsDialog.tsx`
- No new control — style is a routing concern, not a render-time knob. But if the selected model exposes a `style` parameter (e.g. a stylization slider), seed it from locked style.

## Out of scope

- Model catalog changes (no new models added).
- New render-time knobs (cfg_scale, motion, fps stay where they are).
- Rewriting prompt-writing logic — style already influences phrasing inside the prompt; this just makes it explicit.

## Files touched

- `supabase/functions/director-agent/index.ts`
- `src/lib/director/api.ts`
- `src/components/director/ModelChoiceCard.tsx`
- `src/components/director/PromptResultCard.tsx`
- `src/components/director/VideoOptionsDialog.tsx`

## Acceptance

- Director asks style when it can't be inferred from refs/wording.
- Locked-spec recap shows the style chip before model pick.
- Model selected matches the style (photoreal → Kling/Veo, anime → Wan/animatediff, etc.).
- Render dialog opens pre-filled with the locked spec including style.
