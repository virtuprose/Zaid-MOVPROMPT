

## Plan — Auto-generate 12 hero preset video previews via edge function

### Goal
One-click admin button that generates short looping clips for all 12 hero presets and uploads them to the `preset-previews` bucket — replacing today's manual upload-per-preset flow with bulk AI generation.

### Scope: which 12 presets
Source of truth is `HERO_PRESET_IDS` from `src/lib/presets.ts` (already exported). The edge function reads the same list to stay in sync.

### Architecture

**1. New edge function: `generate-preset-preview`**
- Input: `{ presetId: string }` (one at a time — keeps each invocation under timeout, lets the UI show per-preset progress)
- Auth: admin-only. Validates JWT in code and checks `has_role(user_id, 'admin')` against the DB. Returns 403 otherwise.
- Steps:
  1. Look up the preset by id from a small server-side map (label + a tailored video prompt per preset, e.g. Dolly Zoom → "cinematic dolly zoom on a lone figure standing in a foggy street, vertigo effect, shallow depth of field, 24fps film look").
  2. Call the **Lovable AI Gateway video model** (the `videogen` capability is available via the gateway — model `google/veo-3` or whatever is exposed; we'll use `lovable/video` route at `https://ai.gateway.lovable.dev/v1/videos/generations` with `LOVABLE_API_KEY`).
  3. Request: 5-second clip, 480p (small file ~150–500KB target), 16:9, `camera_fixed: false`.
  4. Receive a video URL or base64 payload. Download the bytes.
  5. Upload to `preset-previews` bucket as `{presetId}.mp4` with `upsert: true`, `contentType: video/mp4`, `cacheControl: 3600` — using the **service role key** so RLS doesn't matter.
  6. Return `{ ok: true, presetId, sizeBytes, publicUrl }`. On failure return `{ ok: false, error }` with appropriate status.
- Handle 429 / 402 from the gateway and bubble them up so the UI can show a friendly toast.

**2. Server-side prompt map** (inside the edge function)
Each of the 12 hero presets gets a hand-tuned prompt aimed at making the *camera move or effect* obvious in 5s — not a beautiful scene per se. Examples:
- `dolly-zoom` → "vertigo effect dolly zoom on a person standing on a cliff at sunset, background compresses dramatically, cinematic 35mm"
- `bullet-time` → "frozen moment, camera orbits 180° around a figure mid-jump, water droplets suspended in air, Matrix style"
- `levitation` → "person slowly rising off the ground in a misty forest at dawn, soft volumetric light, weightless"
- ...etc for the remaining 9 (`crash-zoom-in`, `whip-pan`, `lightning`, `time-freeze`, `glitch`, `morph`, `explosion`, `drone-reveal`, `vortex`)

The map lives only in the edge function (single source of truth, easy to tweak without touching client code).

**3. Admin UI: bulk generate button** (`src/components/admin/PresetPreviewsSection.tsx`)
- Add a prominent **"Auto-generate all"** button at the top of the section header (with a `Sparkles` icon).
- Add a **"Generate"** button per card next to "Upload" (so admins can regenerate individual ones).
- Bulk flow:
  - Iterate over `HERO_PRESET_IDS` sequentially (avoids slamming the gateway and keeps progress predictable).
  - For each: set that card's state to "generating…", call the edge function via `supabase.functions.invoke('generate-preset-preview', { body: { presetId } })`, then refresh the listing.
  - Show a top-of-section progress indicator: `Generating 4 / 12 — bullet-time…`.
  - On 429/402 from the function: stop the loop, surface the error toast, and show a "Retry from here" button.
  - On generic failure for one preset: log it, show a per-card error chip, continue with the next.
- Per-card flow: same as above but for one preset.

**4. UX details**
- Disable the bulk button while generating.
- Show estimated time hint (~60–90s per clip × 12 ≈ 10–15 min total) — set expectations.
- Existing manual upload + delete buttons stay (admins can still override AI output with hand-picked clips).

### Files touched
- New: `supabase/functions/generate-preset-preview/index.ts`
- Edited: `src/components/admin/PresetPreviewsSection.tsx` (add bulk + per-card generate buttons + progress UI)
- No DB migrations, no new tables, no client SDK changes (the `preset-previews` bucket already exists and is public).

### Verification
- Open `/admin` → Previews tab → click **Auto-generate all** → progress shows 1/12 → 12/12.
- Each card refreshes to show its new MP4 with a fresh thumbnail.
- Open the main app → hover Dolly Zoom (or any hero preset) → real generated clip plays.
- Click per-card **Generate** on one preset → only that one regenerates, file size + timestamp update.
- Sign out as admin → call the edge function via curl → 401/403.
- Trigger a 402 (no credits) → red toast: "AI credits exhausted, add funds in workspace settings."

### Open question for you
The Lovable AI Gateway exposes video generation, but the supported video model + per-clip cost is non-trivial (~$0.05–$0.50/clip × 12 = ~$0.60–$6 per full bulk run). Confirming you're OK with that cost before I wire it up. If you'd rather use the cheaper text→image route and animate via CSS, say the word and I'll re-plan.

