# Duration audit + slider UI

## Problems

1. **Wrong durations.** Confirmed against fal.ai schema: Seedance 2.0 / 2.0 Fast accept `4–15s` (+ `auto`), not `[5, 10]`. Other model families need the same audit.
2. **UX.** Duration is rendered as segmented buttons. User wants a slider.

## Step 1 — Audit each model's duration against fal.ai

Fetch the official schema for every model in `videoModelControls.ts` and update both `durations` and `maxDurationSec` (in `videoModelCatalog.ts`) to match. Confirmed so far:

| Model | Current | Fal schema |
|---|---|---|
| seedance-2.0 | [5, 10] | 4–15 + auto |
| seedance-2.0-fast | [5, 10] | 4–15 + auto (to verify) |
| seedance-v1-pro / lite | [5, 10] | to verify (likely 5/10) |
| veo-3.1 / 3.1-fast | [4, 6, 8] | to verify |
| veo-3.1-lite / veo-3 / veo-3-fast | [8] | to verify |
| veo-2 | [5, 6, 7, 8] | to verify |
| kling family | [5, 10] | to verify |
| hailuo-02-pro | [6, 10] | to verify |
| hailuo-02-standard / 01 | [6] | to verify |
| runway-gen3-turbo | [5, 10] | to verify |
| ltx variants | [5] | to verify |
| wan-pro / wan-v2.2-a14b | [5, 10] | to verify |

For each model the duration spec is one of two shapes:

- **Discrete set** (e.g. Kling: `5 \| 10`) → keep `durations: number[]`, render as slider snapping to those marks.
- **Continuous range** (e.g. Seedance 2.0: `4..15`) → new fields `durationMin`, `durationMax`, `durationStep` (default `1`), optional `durationAuto: true` for an "Auto" toggle.

Also re-check `maxResolution`, audio support, and aspect lists while the schemas are open — only update if mismatched (no scope creep).

## Step 2 — Slider UI in `VideoOptionsDialog.tsx`

Replace the `Segmented` duration block with a `Slider`:

```text
Duration                              7s
[●━━━━━━━━━○━━━━━━━━━━━━━━━━━━━]
4s                                    15s
```

- For continuous models: `min/max/step` from controls, current value shown inline, end-labels under the track.
- For discrete models: still a slider, but `step` derived so it snaps only to allowed values (use `value` index into `durations[]`, or use `Slider` with custom `step` and clamp `onValueChange` to the nearest allowed value).
- If `durationAuto` is true, show a small "Auto" toggle next to the value; when on, slider is disabled and we send `duration: "auto"`.
- Single-option durations (e.g. Hailuo 01 = `[6]`) → render as a static read-only chip, not a slider.

## Step 3 — Type changes

`videoModelControls.ts`:

```ts
type ModelControls = {
  // ...
  durations?: number[];          // discrete set
  durationMin?: number;          // continuous range
  durationMax?: number;
  durationStep?: number;         // default 1
  durationAuto?: boolean;        // model accepts "auto"
};

type VideoOptions = {
  // ...
  duration?: number | "auto";
};
```

`generate-video/index.ts`: forward `"auto"` straight through for Seedance 2.0 (already a valid enum value); no other backend changes.

## Out of scope

- No changes to the eligibility/rewrite flow.
- No changes to the recommendation ranking (the catalog's `maxDurationSec` is updated for accuracy, but scoring weights stay the same).
- No new analytics or DB columns.

## Files

- `src/lib/director/videoModelControls.ts` — schema fields + corrected per-model values
- `src/lib/director/videoModelCatalog.ts` — `maxDurationSec` corrections only where mismatched
- `src/components/director/VideoOptionsDialog.tsx` — duration slider + auto toggle
- `supabase/functions/generate-video/index.ts` — accept `"auto"` for Seedance 2.0 duration (no-op if already pass-through)
