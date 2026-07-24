# Refocus MovPrompt: Ads-first + Ad Template Creator

Three shifts, one plan:
1. **Remove the AI Director completely** (UI, code, edge functions, DB, storage, all handoffs).
2. **Elevate Ads (Marketing Studio) to the main tool** — default landing surface after login.
3. **Rebuild MovPrompt as the "Ad Template Creator"** — a workshop for authoring reusable ad templates that feed the Ads tool's template library.

Shipped in **3 phases** so nothing breaks midway.

---

## Phase 1 — Remove AI Director

**Frontend**
- Delete `src/pages/Director.tsx` and every file under `src/components/director/` (~38 files).
- Delete `src/lib/director/` helpers and any `director-*` types.
- Remove Director routes from `src/App.tsx` (`/director`, `/director/:sessionId`).
- Remove Director entries from `TopNav.tsx`, mobile menu, dashboards, Library filters, quick actions.
- Remove the "Open in AI Director" handoff button from `WorkflowPanel.tsx`.
- Purge Director translation keys from `en.ts` / `ar.ts`.

**Backend**
- Delete edge functions: `director-agent`, `director-orchestrate`, `director-summarize`.
- Migration to drop tables: `director_sessions`, `director_user_memory`, `director_message_feedback`.
- Delete storage bucket `director-uploads` (drop policies + bucket).
- Update the `mcp` server tool list; redeploy.

**Cleanup**
- Remove Director copy from `About`, `Landing`, `Learn`, `Docs`.
- Audit `credit_prices` for Director-only rows.

---

## Phase 2 — Ads as the main tool

- Rename **Marketing Studio → Ads** everywhere (UI, nav, page title, SEO, translations).
- Move `/marketing` → `/ads` with a client redirect for old bookmarks.
- Update `RootRoute` in `App.tsx`: authenticated users → `/ads`; unauthenticated → Landing.
- `TopNav`: **Ads** (primary) + **MovPrompt** (template creator) + **Library** + **Learn/Docs**.
- Landing / About / Learn: reposition MovPrompt as **"AI ad creative studio"**.
- Add a **Templates** section inside the Ads page — a grid the new MovPrompt writes into (see Phase 3).

---

## Phase 3 — Rebuild MovPrompt as the Ad Template Creator

**Concept change (this is the big one):**
MovPrompt is no longer a per-model prompt builder with start/end frames and model pickers. It becomes a focused workshop where the user **creates a new ad video template**, previews it as a short video, and **saves it to the Ads tool's template library**. The old single-frame / two-frame / storyboard / model-picker flow is retired.

### Two input paths, one output

The builder opens on a single screen that asks: *"How do you want to create this template?"*

**Path A — Describe the template**
- Freeform textarea + voice input (reuse `DescribeAdMic.tsx`).
- Guided chips to shape the concept: **Hook style** (fast cut, slow reveal, POV, testimonial), **Vibe** (luxury, playful, cinematic, gritty), **Pacing** (snappy 6s, standard 10s, extended 15s), **Aspect** (9:16 / 1:1 / 16:9), **Sound feel** (voiceover, music-only, ambient).
- Optional: attach a reference still image.

**Path B — Upload a concept video**
- Drop zone accepting MP4 / MOV up to ~30s.
- On upload: extract 3 evenly-spaced keyframes (reuse `extractVideoKeyframes` from `src/lib/videoFrames.ts`).
- Send frames + user notes to a new edge function `analyze-ad-concept` which uses Gemini vision to produce a structured **Template Draft** (shot beats, camera language, pacing, mood, sound cue, on-screen text style).

### Template Draft review

Both paths converge on a **Template Draft card** showing:
- Title (AI-suggested, editable)
- Logline (1 sentence)
- Shot beats (3–5 lines, each editable)
- Camera language + pacing + vibe tags (chips, editable)
- Recommended aspect ratio + duration
- Negative-prompt block

User can edit any field inline. Buttons: **Regenerate**, **Preview video**, **Save to Ads**.

### Preview render

- **Preview video** calls a new edge function `render-ad-template-preview` that generates a short (5–6s) sample clip from the finalized template. Uses the existing FAL video pipeline (Seedance / Kling lite tier by default) — keeps preview cost predictable.
- Clip is stored in `generation-images` bucket (or a new `ad-templates` bucket if isolation is preferred) and shown inline.

### Save to Ads template library

- New table `ad_templates` (id, user_id, title, logline, beats[], tags[], aspect, duration, negatives, preview_video_url, source_type: 'described' | 'from_video', source_video_url?, created_at).
- On save, the template appears in the **Templates** grid on the Ads page and can be applied to a new ad render (Ads reads from `ad_templates` when picking a template).

### UI shape

- New `/movprompt` route (or keep `/`), single-page builder.
- Left: Path A / Path B toggle + inputs.
- Right: Template Draft card (empty state → populated after generate) + preview player.
- Retire `WorkflowPanel.tsx` (or reduce it drastically) — 2k lines of model/frame logic goes away.
- Retire `ConfigPanel.tsx`, `ModelPicker.tsx`, per-model contract files (`modelContracts.ts`, `modelLimits.ts`, `models.ts` model catalog usage from the builder path).
- The `generate-prompt` edge function and its `experts/` folder are no longer used by the builder — either delete or keep only if MCP / API consumers still reference them (audit during phase).

### Backend surface

- **New**: `analyze-ad-concept` edge function (video keyframes + text → Template Draft JSON via Gemini).
- **New**: `render-ad-template-preview` edge function (Template Draft → short FAL video).
- **New**: `ad_templates` table + RLS + GRANTs.
- **New**: `credit_prices` rows — `ad_template_analyze` (4), `ad_template_preview` (per-second, matches chosen model tier).
- **Retired**: `generate-prompt`, `plan-storyboard` (delete after confirming no other consumers).

---

## Phase order & rollout

1. **Phase 1** first (Director removal) — isolated, easy to verify.
2. **Phase 2** next (Ads promotion) — routing/nav/copy only.
3. **Phase 3** last (MovPrompt → Ad Template Creator) — biggest change, but scoped to a new page + two new edge functions + one new table.

Each phase ends with typecheck + preview verification.

## Technical details

- Director DB drop: single migration `DROP TABLE IF EXISTS public.director_message_feedback, public.director_sessions, public.director_user_memory CASCADE;`.
- `director-uploads` bucket: drop policies then `DELETE FROM storage.buckets WHERE id = 'director-uploads'` (after removing objects).
- Redirects: `<Route path="/marketing" element={<Navigate to="/ads" replace />} />` and same for `/director`.
- `ad_templates` migration follows the standard 4-step pattern (CREATE + GRANT to authenticated & service_role + RLS + policies scoped to `auth.uid()`).
- Video preview reuses the existing FAL integration — no new provider credentials.
- No changes to auth, credits ledger, or referrals systems.
