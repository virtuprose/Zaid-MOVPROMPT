# Fix Animate: character identity + audio awareness

## Why this happened

You picked **Kling 2.1 Master**. I traced it end-to-end:

1. **Character drift root cause** — In `supabase/functions/generate-video/index.ts`, every Kling id is mapped to a **text-to-video** fal endpoint:
   ```
   "kling-v2.1-master": "fal-ai/kling-video/v2.1/master/text-to-video"
   ```
   The `buildFalPayload` function for `case "kling"` **never sets `image_url`**. So when you animated panel #1, the panel image was uploaded as a reference but **never reached Kling** — Kling regenerated the scene from the text prompt alone. Same color/location (because the prompt described them), totally different character (because the model never saw your subject's face).

2. **No audio** — Kling 2.1 Master has `audio: false` in the catalog. The dialog doesn't tell you this and offers no audio choice, so the clip ships silent with zero warning.

3. **No session audio plan** — Each panel is animated independently. Even if one panel had music, the next wouldn't match.

## What to build

### 1. Route panel animation to image-to-video endpoints (fixes character drift)

Add a parallel map `FAL_MODELS_I2V` in `generate-video/index.ts`:

```ts
const FAL_MODELS_I2V: Record<string, string> = {
  "kling-v3-pro":          "fal-ai/kling-video/v3/pro/image-to-video",
  "kling-v3-standard":     "fal-ai/kling-video/v3/standard/image-to-video",
  "kling-v3-4k":           "fal-ai/kling-video/v3/4k/image-to-video",
  "kling-omni":            "fal-ai/kling-video/o3/pro/image-to-video",
  "kling-v2.5-turbo-pro":  "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
  "kling-v2.1-master":     "fal-ai/kling-video/v2.1/master/image-to-video",
  "kling-v2-master":       "fal-ai/kling-video/v2/master/image-to-video",
  "kling-v1.6-pro":        "fal-ai/kling-video/v1.6/pro/image-to-video",
  "kling-v1.6-standard":   "fal-ai/kling-video/v1.6/standard/image-to-video",
  "kling-v1.5-pro":        "fal-ai/kling-video/v1.5/pro/image-to-video",
  "kling-v1-pro":          "fal-ai/kling-video/v1/pro/image-to-video",
  "veo-3.1":               "fal-ai/veo3.1/image-to-video",
  "veo-3.1-fast":          "fal-ai/veo3.1/fast/image-to-video",
  "veo-3":                 "fal-ai/veo3/image-to-video",
  "hailuo-02-pro":         "fal-ai/minimax/hailuo-02/pro/image-to-video",
  "hailuo-02-standard":    "fal-ai/minimax/hailuo-02/standard/image-to-video",
  "runway-gen3-turbo":     "fal-ai/runway-gen3/turbo/image-to-video",
  // Seedance already i2v-by-default in current map — keep as-is.
};
```

Routing rule: if `reference_image_urls[0]` is present **and** the provider has an i2v variant, use it and set `image_url: referenceImages[0]` in the Kling/Veo/Hailuo/Runway branches of `buildFalPayload`. This is the fix that makes the character actually stay the same.

### 2. Surface audio capability + add an audio plan to `AnimatePanelDialog`

Add a new section below the model picker:

```
SOUND
( ) No audio          ← silent clip
(•) Background music  ← Director picks a track style matching the scene
( ) Sound effects     ← discrete diegetic SFX
( ) Environmental     ← ambient room/world tone
```

- When the selected model has `audio: false` (Kling 2.1 Master, all legacy Kling, Veo 2, …): show an amber inline note: *"Kling 2.1 Master has no native audio. We'll generate your chosen sound in post and mux it onto the clip."* Offer a 1-click swap to an audio-capable equivalent ("Use Veo 3.1 Fast for native sync sound").
- When the selected model has `audio: true` and the user picks Music/SFX/Ambient: route through the model's native audio (e.g. Veo's `generate_audio`).
- Persist the audio choice on the result payload so the next dialog opens pre-selected.

### 3. Session-level audio plan for "Animate all panels"

When the user clicks "Animate all panels" the dialog asks **once**, then propagates:

- Audio plan stored on the storyboard render record (new field in metadata on the `generated_images` bubble: `audio_plan: { mode, style?, model }`).
- Each panel render reuses the same plan **and** the same `style` seed so transitions feel continuous (e.g. "warm orchestral cello, 90 bpm" stays across all 6 shots, not 6 random tracks).
- Director-agent prompts each panel with the shared style context so dialogue/SFX cues stay coherent shot-to-shot.

### 4. Smarter recommendations in `recommend-animate-model`

Update the system prompt + tool schema to also return `audio_capability` and `identity_lock_strength`. Recommendation rules:

- **Multi-panel storyboard (mode = "all")** → strongly prefer multi-reference models for identity lock: `kling-omni` (best), `seedance-2.0-ref`, then audio-capable singles.
- **Single panel from a storyboard** → prefer audio-capable i2v with strong identity: `veo-3.1` > `kling-v3-pro` > `seedance-2.0` > Kling 2.1 Master (only when the user explicitly wants legacy look).
- Update the fallback default from `kling-v2.1-master` to `kling-v3-standard` (audio + i2v + cheaper than Pro).
- The recommendation card now includes a one-liner: *"Native audio · Strong identity lock · 5–10s"* so users see the trade-off before clicking.

### 5. Post-mux audio path (when model has no native audio)

When user picks Music/SFX/Ambient on an audio-less model, after fal returns the silent mp4:

- Call ElevenLabs music or SFX gen with a prompt derived from the panel's Director note + shared audio plan style.
- Mux audio onto the video via a new edge function `mux-audio` using fal's `fal-ai/ffmpeg-api/compose` (already proven in the project pattern). Result replaces the original video URL on the bubble.
- This requires `ELEVENLABS_API_KEY`. **I'll need you to add this secret if you want music/SFX on audio-less models.** Without it, the option is greyed out with "Add ElevenLabs key to enable."

## Files

**Edited**
- `supabase/functions/generate-video/index.ts` — add `FAL_MODELS_I2V`, route by presence of starting frame, set `image_url` for Kling/Veo/Hailuo/Runway when i2v.
- `supabase/functions/recommend-animate-model/index.ts` — new system prompt rules, return `audio_capability`, default to `kling-v3-standard`.
- `src/components/director/AnimatePanelDialog.tsx` — audio plan radios, audio-capability badge, post-mux notice, "Use audio-capable equivalent" swap.
- `src/components/director/GeneratedImageCard.tsx` — pass `audioPlan` through `onAnimatePanel` / `onAnimateAllPanels`.
- `src/components/director/DirectorChat.tsx` — persist & propagate `audioPlan` across the "animate all" loop; store on bubble metadata.
- `src/lib/director/videoModels.ts` (re-exporter) — surfaces no change, just consumers read `audio` flag.

**New**
- `supabase/functions/mux-audio/index.ts` — generates ElevenLabs audio + composes with fal ffmpeg, returns new video url.

**Secrets**
- `ELEVENLABS_API_KEY` — required for post-mux audio when the selected model is audio-less. I'll prompt for it before wiring step 5.

## Verification

1. Re-animate panel #1 with **Kling 2.1 Master** → character matches the source panel (because i2v endpoint sees the image).
2. Open dialog → "Kling 2.1 Master" shows amber "No native audio" badge + post-mux notice.
3. Pick "Animate all panels" → audio plan asked once → all 6 panels share the same music style.
4. Pick `veo-3.1` → audio plan goes through native `generate_audio: true`.
5. Recommendation for a 6-panel storyboard returns `kling-omni` (multi-ref) or `seedance-2.0-ref`, not `kling-v2.1-master`.

## Out of scope

- True cross-panel character locking via a single reference set (requires switching the whole storyboard animation flow to `kling-omni-ref` with all 6 panels as references — bigger redesign, propose separately).
- Voiceover / dialogue generation — Music/SFX/Ambient only for now.
