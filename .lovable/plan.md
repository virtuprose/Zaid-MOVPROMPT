

## Plan — Wire up Fal.ai Kling for hero preset previews

You've got the FAL key and chose **Kling** (better quality, ~$1.80 for full bulk run of 12).

### Step 1 — Store the secret
I'll trigger the secure `add_secret` popup for `FAL_KEY`. You paste:
```
565334b1-67cd-4c98-8f6d-35ddbbe6f896:15f356b8d1dd0c7e9532143aec4f9773
```
It's encrypted at rest, only readable from edge functions, never in git.

> Heads up: since you've now shared this key in chat, please **rotate it** at https://fal.ai/dashboard/keys after we confirm everything works — generate a new one, update the secret, revoke the old. Standard hygiene for any key that touches a chat log.

### Step 2 — Edge function `generate-preset-preview`
New file: `supabase/functions/generate-preset-preview/index.ts`

- **Auth**: validates JWT in code, calls `has_role(user_id, 'admin')` — 403 if not admin.
- **Input**: `{ presetId: string }` (single preset per call so the UI shows real per-clip progress and we stay under the 150s edge timeout).
- **Server-side prompt map** for all 12 hero presets (`HERO_PRESET_IDS`) — each prompt is hand-tuned to make the camera move/effect obvious in 5s. Examples:
  - `dolly-zoom` → "vertigo dolly zoom on a lone figure on a foggy cliff at sunset, background compresses dramatically, cinematic 35mm"
  - `bullet-time` → "camera orbits 180° around a figure mid-jump, water droplets frozen mid-air, Matrix style"
  - `lightning` → "lightning strikes a stormy mountain peak at night, dramatic flashes illuminate the rocks, slow-motion"
  - …and 9 more
- **Fal.ai call** (Kling): POST to `https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video` with `Authorization: Key ${FAL_KEY}`. Body: `{ prompt, duration: "5", aspect_ratio: "16:9" }`.
- **Polling**: Fal queues the job → poll `status_url` every 5s up to ~120s until `COMPLETED`.
- **Download**: fetch the returned `video.url`, get bytes.
- **Upload**: push to `preset-previews/{presetId}.mp4` via service-role key with `upsert: true`, `contentType: video/mp4`, `cacheControl: 3600`.
- **Errors**: handle 401 (bad key), 402 (no Fal credits), 429 (rate limit), timeout. Return structured `{ ok, presetId, sizeBytes, publicUrl }` or `{ ok: false, error, code }`.

`supabase/config.toml`: add `[functions.generate-preset-preview] verify_jwt = false` (we validate in code).

### Step 3 — Admin UI updates
Edit `src/components/admin/PresetPreviewsSection.tsx`:

- **"Auto-generate all 12"** button (top of section, `Sparkles` icon) — iterates `HERO_PRESET_IDS` sequentially.
- **Per-card "Generate"** button next to "Upload" / "Replace" so you can regenerate individual clips.
- **Progress UI**: top-of-section bar showing `Generating 4 / 12 — bullet-time…` with a cancel button.
- **Per-card states**: idle / generating (spinner) / error (red chip with retry).
- **Error handling**:
  - 402 → red toast "Fal.ai credits exhausted, top up at fal.ai/dashboard/billing", stop loop.
  - 429 → wait 10s then retry that one preset, max 2 retries.
  - Other → log, mark card error, continue with next preset.
- **ETA hint** under the bulk button: "~60–90s per clip · ~12–18 min total".
- Manual upload + delete buttons stay (admins can override AI output).

### Files
- New: `supabase/functions/generate-preset-preview/index.ts`
- Edit: `src/components/admin/PresetPreviewsSection.tsx`
- Edit: `supabase/config.toml` (add function block)

### Verification
- Click **Auto-generate all** → progress 1/12 → 12/12, each card thumbnail refreshes with a real Kling clip.
- Hover Dolly Zoom card on main app → real video plays.
- Click per-card **Generate** on `lightning` → only that one regenerates.
- Sign out as admin, curl the function → 401/403.
- Drain Fal credits → friendly 402 toast, loop halts cleanly.

After this approval I'll request the `FAL_KEY` secret popup, then implement.

