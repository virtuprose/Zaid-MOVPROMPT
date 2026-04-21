
## Per-preset "Generate" button that matches the preset's exact effect

Add a **Generate** button to every preset card (not just the 12 hero ones). The generated 5s clip must demonstrate **that specific preset's** camera move/effect — e.g. "Push In" generates a push-in shot, "Whip Pan Right" generates a whip pan right, "Levitation" shows levitation. No generic clips.

### What changes

**1. `supabase/functions/generate-preset-preview/index.ts`**

Today the function has a hard-coded `PROMPTS` map for 12 hero ids and rejects everything else. Replace that gate with a **deterministic, preset-aware prompt builder**:

- Keep the existing 12 hero `PROMPTS` verbatim (already tuned).
- For any other `presetId`, resolve metadata from one of two sources, in order:
  1. **Client-provided** `label`, `description`, `bestFor`, `groupId` in the submit payload (built-in non-hero presets — read from `PRESETS` in `src/lib/presets.ts`).
  2. **Database fallback** — `select label, description, best_for, group_id from custom_presets where id = $1` using the service-role client (custom presets created from the admin).
- If neither source yields a label+description, return `bad_input`.
- Build the Fal prompt from a strict template that puts the **camera move / effect itself as the subject of the shot**, so the model can't drift into a generic scene:

  ```
  Cinematic 5-second video that clearly demonstrates a "{label}" {effectKind}.
  The {effectKind} must be the visible focus of the shot.

  Effect description: {description}
  Best used for: {bestFor}

  Scene: {sceneHint}

  Style: 35mm anamorphic, dramatic lighting, shallow depth of field,
  photoreal, high detail. Subject and framing chosen to make the
  "{label}" {effectKind} unmistakable from the first frame.
  ```

  Where:
  - `effectKind` = `"camera move"` if `groupId` ∈ {`basic`, `epic`}, else `"visual effect"`.
  - `sceneHint` = a small deterministic per-group fallback subject (e.g. basic→"a lone figure walking down a city street at dusk", epic→"a vast canyon at golden hour", effects→"a dancer in a dark studio with a single key light", pulse→"a sports car drifting on a wet street at night", mix→"a rain-soaked alley with neon signs"). This guarantees a coherent backdrop while the **preset** dictates the motion.

- Validation: `presetId` must match `^[a-z0-9-]+$`; reject otherwise.
- Polling, Fal call, storage upload, and response shape stay exactly the same. Only the submit branch's prompt resolution changes.

**2. `src/components/admin/PresetPreviewsSection.tsx`**

- Remove the `HERO_PRESET_IDS.includes(preset.id)` gate around the Generate button — render it on every card (built-in + custom).
- When invoking `action: "submit"`, pass the preset metadata so the backend doesn't need a DB roundtrip for built-ins:
  ```ts
  body: {
    action: "submit",
    presetId: preset.id,
    label: preset.label,
    description: preset.description,
    bestFor: preset.bestFor,
    groupId: preset.group,
  }
  ```
- Keep all existing per-card states (`isGen`, polling, status text, error toasts) — just applied to the full grid.
- Search, group filter, status filter, "New Preset" stay as-is.

**3. No DB schema changes**
`custom_presets` already stores `description`, `best_for`, `group_id`. No migration needed.

### Out of scope
- Re-recording the 12 hero clips (their wording is unchanged).
- Bulk generate (intentionally removed earlier).
- Changing Fal model/aspect/duration (still Kling v1 standard, 5s, 16:9).

### Files touched
- `supabase/functions/generate-preset-preview/index.ts`
- `src/components/admin/PresetPreviewsSection.tsx`
