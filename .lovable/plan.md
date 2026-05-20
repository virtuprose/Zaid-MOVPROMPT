# Duration → slider + per-model duration audit

Replace the chip row with a real **slider** that snaps to each model's allowed duration set, and fill in the missing model entries so the slider's range matches what each video model actually accepts at the provider.

## UI change (in `src/components/WorkflowPanel.tsx`)

Replace the chip group above the Generate button with a slider block:

```
Video duration                              10s
●━━━━━━━━━━━━━━━━━━━━━○━━━━━━━━━━━━●
4s                                          15s
                                         [ Auto ]   ← only when model supports auto
```

- Use the existing `Slider` from `@/components/ui/slider` (Radix).
- **For continuous models** (`durationMin`/`durationMax`/`durationStep`): `min`/`max`/`step` are passed straight through.
- **For discrete models** (`durations: number[]`): slider walks the array by index (`min=0`, `max=durations.length-1`, `step=1`) and the displayed value is `durations[idx]`. Tick marks shown beneath as tiny dots aligned to each allowed value.
- **For `durationAuto`**: render an `Auto` toggle pill to the right of the slider; when active, the slider is dimmed and `targetDuration = "auto"`.
- **Hide entirely** when the model has no duration parameter (Hailuo 02 Pro, Hailuo 01, LTX, Veo 3 / Veo 3 Fast which only accept 8s — show a read-only "8s · fixed" label instead).
- Current value rendered as a chip on the right end of the track ("10s"). Min/max labels under each end of the track.
- Per-model persistence via `localStorage` (`movprompt.targetDuration.{model}`) — already in place.

No change to the edge function — it already accepts `targetDuration` as `number | "auto"`.

## Duration audit — fix gaps in `src/lib/director/videoModelControls.ts`

The UI catalog (`videoModels.ts`) lists models that don't have a `CONTROLS` entry, so they currently hit the bare `FALLBACK` (no duration). Add/correct:

| Model ID | Vendor duration spec | Current | Fix |
|---|---|---|---|
| `seedance-2.0` | 4–15s integer + `auto` (same as Ref) | **missing → fallback** | Add: `durationMin: 4, durationMax: 15, durationStep: 1, durationAuto: true`, default `"auto"` |
| `seedance-2.0-ref` | 4–15s + auto | ✅ correct | — |
| `seedance-v1-pro` | 3–12s integer | `[5, 10]` only | Switch to `durationMin: 3, durationMax: 12, durationStep: 1`, default `5` |
| `seedance-v1-lite` | 3–12s integer | `[5, 10]` only | Same as Pro |
| `veo-3.1`, `veo-3.1-fast`, `veo-3.1-lite` | 4 / 6 / 8 | ✅ | — |
| `veo-3`, `veo-3-fast` | 8 only | ✅ | UI shows "8s · fixed" |
| `veo-2` | 5–8s | `[5,6,7,8]` ✅ | — |
| `kling-omni` | 3–15s | ✅ | — |
| `kling-omni-edit` | 3–10s | ✅ | — |
| `kling-motion-control` | 5 or 10 | ✅ | — |
| `kling-v3-pro` | 3–15s | ✅ | — |
| `kling-v3-standard`, `kling-v3-4k` | 5 or 10 | ✅ | — |
| All `kling-v1*`/`v1.5*`/`v1.6*`/`v2*`/`v2.1-master`/`v2.5-turbo-pro` | 5 or 10 | ✅ | — |
| `hailuo-02-pro`, `hailuo-01` | fixed (no `duration` param) | ✅ | Slider hidden |
| `hailuo-02-standard` | 6 or 10 | ✅ | — |
| `runway-gen3-turbo` | 5 or 10 | ✅ | — |
| `ltx-video`, `ltx-video-13b` | 5s only | ✅ | Slider hidden |
| `wan-pro`, `wan-v2.2-a14b` | 5 or 10 | ✅ | — |
| `any` (Universal Prompt) | n/a | falls back | Treat as continuous `5–15s step 1`, default `10`, no auto |

## Files touched

- `src/lib/director/videoModelControls.ts` — add `seedance-2.0` entry, widen `seedance-v1-pro` / `seedance-v1-lite` to 3–12s continuous, add an explicit fallback for the `any` model in `getModelControls` (or a new `UNIVERSAL` constant).
- `src/components/WorkflowPanel.tsx` — replace the chip row with the slider + Auto pill + fixed-duration label branches. Imports `Slider` from `@/components/ui/slider`.

## Out of scope

- No change to the edge function or `timelineAddendum` (already duration-driven).
- No change to the actual **Generate Video** dialog's render-duration control (this slider only steers the **prompt** pacing; the video-render duration is chosen separately when the user hits Generate Video).
- No new translations beyond the existing `wp.videoDuration`.

## Verification

1. Select **Seedance 2.0** → slider 4 → 15s, defaults to Auto, "Auto" pill is active.
2. Select **Seedance 1 Pro** → slider 3 → 12s, defaults to 5s.
3. Select **Kling 3.0 Pro** → slider 3 → 15s.
4. Select **Kling 2.5 Turbo Pro** → slider snaps between 5 and 10 only (2 ticks).
5. Select **Veo 3** → no slider, shows "8s · fixed" label.
6. Select **Hailuo 02 Pro** / **LTX Video** → duration block hidden.
7. Drag slider, reload page → last value persists per model.
8. Generate with Timeline ON and 12s → output TIMELINE spans `[00:00 – 00:12]`.
