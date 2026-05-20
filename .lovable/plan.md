# Ask "how many seconds?" before generating

After the user has picked a model and uploaded references, surface a small **Video duration** chooser directly above the **Generate Cinematic Prompt** button so the generated prompt is calibrated to the right length.

## UI (in `src/components/WorkflowPanel.tsx`)

Render a new compact row immediately above the Generate button (and the Timeline pill we just added):

```
Video duration   [ 5s ] [ 8s ] [ 10s ] [ 15s ] …
```

- Chips come from the selected model's `ModelControls` (`src/lib/director/videoModelControls.ts`):
  - If `durations: number[]` → render each as a chip.
  - If `durationMin/Max/Step` → render a small inline `<input type="number">` constrained to the range.
  - If `durationAuto` is true → include an `Auto` chip.
- Default selection = the model's `defaults.duration` (or 10 for the `any` model).
- Persist last choice per model in `localStorage` (`movprompt.targetDuration.{model}`).
- Visual treatment matches the Audio / Timeline pills (same sub-tab pill style, `aria-pressed`).
- Label uses i18n key `wp.videoDuration` ("Video duration" / "مدة الفيديو").
- Hidden only when the selected model has neither `durations` nor a `durationMin/Max` (extremely rare; falls back to a single 10s chip).

## State + payload

In `WorkflowPanel.tsx`:
- Add `const [targetDuration, setTargetDuration] = useState<number | "auto">(...)` resolved from `videoModelControls[selectedModel]?.defaults?.duration ?? 10`.
- Reset / re-resolve when `selectedModel` changes (snap to nearest allowed value).
- In the `supabase.functions.invoke("generate-prompt", { body: ... })` call (line 565), add:
  ```
  targetDuration,
  ```

## Edge function (`supabase/functions/generate-prompt/index.ts`)

- Destructure `targetDuration` from `body` (number | "auto" | undefined).
- When present and numeric:
  - Pass it into `timelineAddendum({ defaultDuration: targetDuration, perShot })` instead of the hard-coded 10.
  - Append to `userText`: `Target video duration: ${targetDuration}s — set suggestedDuration accordingly and pace beats to this exact length.`
- Echo it back in the result `meta` so the UI can show a "10s" badge on the result card (nice-to-have, same row as the Timeline badge).

## Files touched

- `src/components/WorkflowPanel.tsx` — new state, chip row, payload field.
- `src/i18n/translations/en.ts` + `ar.ts` — `wp.videoDuration`, `wp.videoDurationHint`.
- `supabase/functions/generate-prompt/index.ts` — read `targetDuration`, feed it to `timelineAddendum` and `userText`.

## Out of scope

- No change to the Director chat composer (Director already asks duration conversationally via the `QuestionCard` duration presets).
- No change to `generate-video` — the chosen seconds only steer the **prompt**; the actual render duration is still chosen in the Video Options dialog when the user hits "Generate Video".
- No new credits cost.

## Verification

1. Pick `seedance-2.0` → duration chips show `5 / 10` (its allowed set), defaults to 10, persists per-model on reload.
2. Pick `veo-3.1` → chips show `4 / 6 / 8`, defaults to 8.
3. Pick `kling-v3-pro` → chips show `3 … 15`, defaults to 5.
4. Pick `any` → defaults to 10 with a free numeric input.
5. Generate with Timeline ON and 15s selected → output TIMELINE section spans `[00:00 – 00:15]` with the 10–16 beat calibration.
6. Generate with Timeline OFF and 5s selected → `suggestedDuration: "5s"` in the result.
