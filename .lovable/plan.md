
## Goal

When the user briefs a multi-act narrative (e.g. "2-minute animated video, a hero fighting monsters from different planets"), the Director runs a brand-new step-by-step **story mode** instead of the existing single-shot flow, ending with **one stitched ~2-minute video** assembled from 8 parallel 15-second Seedance 2.0 renders.

## Target flow

```
Turn 1  user: "2-min animated video, hero vs monsters from different planets"
Turn 2  Director (story mode detected) → renders an opening KEY FRAME (single_panel, 16:9)
        + drafts 3 distinct story concepts (logline + tone + visual hook for each)
Turn 3  Director: one question, two parts:
          a) Pick a concept (3 chips)
          b) Pick aspect ratio (16:9 default, 9:16, 1:1)
        Escape chip on every story-mode turn: "Switch to single shot"
Turn 4  user picks concept + aspect → Director kicks off the ASSET BUNDLE in parallel:
          - 1 character sheet (using uploaded face if any, else generated)
          - 1 prop sheet
          - 7 location options (single_panel × 7, same aspect)
        While bundle is rendering, Director asks ONE question:
          "Drag the location you want into the slot."
Turn 5  user drops 1 location → Director: "Locked in. Kicking off 8 acts in parallel."
        - Saves character + prop + chosen location to session.brief_context.story_assets
        - Calls request_video_generation 8× in parallel, all Seedance 2.0:
            15s · 16:9 (or chosen ratio) · audio on
            Each act gets a Director-authored prompt from the concept beat sheet
            (Act 1 opens, Acts 2-7 monster-of-the-planet beats, Act 8 resolves)
            All 8 share: character_ref + prop_ref + location_ref + locked style spec
Turn 6  As acts complete (polled like today), Director surfaces a "Stitch now"
        action. On click: new edge function concatenates the 8 MP4s in order →
        single ~120s video bubble in the chat.
```

## Changes

### 1. `supabase/functions/director-agent/index.ts` — system prompt + tools

**A. New STORY MODE section** placed before FIRST-TURN PATH CHOICE. Trigger if EITHER:
- Heuristic on the first user turn: brief mentions duration ≥ 45s OR words "story / film / movie / episode / series / acts / scenes / chapters / 2 minutes / multi-shot narrative", AND no explicit "single shot" override.
- OR the user later taps a "Story mode" chip (offered as a soft hint on the existing fork).

When triggered, the Director MUST run this script (one question per turn, step labels in `reason`):

- **Step 1 of 5 — Opening key frame.** Call `generate_reference_image` mode `single_panel`, 16:9 default, locked spec echoed in prompt; in `directors_note` include the 3 concept loglines + "Step 1 of 5 — locking the opener."
- **Step 2 of 5 — Pick a concept.** `ask_clarification` with ONE question and 3 chips = the 3 concept loglines (one tap each). `allow_other: false`. Always append an escape chip "Switch to single shot".
- **Step 3 of 5 — Aspect ratio.** `ask_clarification` with chips ["16:9", "9:16", "1:1"], default 16:9.
- **Step 4 of 5 — Asset bundle.** Call a new tool `generate_story_bundle` (see below) with `{ concept_id, aspect, character_brief, prop_brief, location_briefs:[7] }`. While it streams, the very next turn asks ONE question: "Drag one location into the slot." (no chips; the UI shows the 7 returned panels with a drop target).
- **Step 5 of 5 — Launch the 8 acts.** Once the user drops a location, call new tool `request_story_render` with `{ session_id, concept_id, aspect, character_url, prop_url, location_url, act_prompts:[8] }`. The 8 `act_prompts` are written by the Director from the chosen concept's beat sheet (opener → 6 monster beats → resolution). All 8 pin: Seedance 2.0, 15s, audio on, chosen aspect, attached references.

**B. Hard rules for story mode:**
- Every story-mode `ask_clarification` MUST include the escape chip "Switch to single shot" — tapping it exits story mode and re-enters the existing FIRST-TURN PATH CHOICE fork.
- Style/spec continuity rule already in the prompt applies to all 8 acts (same Seedance 2.0, same aspect, same audio, same color grade, same character/prop/location refs).
- No `ask_model_choice` in story mode — Seedance 2.0 is locked.

**C. New tool definitions added to the agent's tool list:**
- `generate_story_bundle` — `{ concept_id, aspect, character_brief, prop_brief, location_briefs[7], reference_urls? }`. Server-side fans out to `generate-reference-image` (1 character_sheet + 1 product/prop sheet + 7 single_panel locations) in parallel and returns `{ character_url, prop_url, location_urls[7] }`.
- `request_story_render` — `{ aspect, character_url, prop_url, location_url, act_prompts[8], audio:true }`. Server-side enqueues 8 Seedance 2.0 jobs in parallel and returns `{ render_id, act_job_ids[8] }`.

### 2. New edge function `supabase/functions/story-bundle/index.ts`
- Verifies JWT, checks credits: `8 × 5 = 40` for assets bundle (1 char + 1 prop + 7 locations × 5 each = 45; use existing `PER_IMAGE_CREDITS`).
- Fans out 9 calls to `generate-reference-image` via `supabase.functions.invoke` with `Promise.all`.
- Returns `{ character_url, prop_url, location_urls[7] }`.
- All 9 share the same `locked_spec` (style, aspect) so look stays coherent.

### 3. New edge function `supabase/functions/story-render/index.ts`
- Verifies JWT, charges credits for 8 Seedance 2.0 jobs (use existing `priceFor("video", "seedance-2.0", 15)` × 8).
- Inserts 8 rows into `video_jobs` with a new column `story_render_id uuid` + `act_index int` (migration below).
- Calls existing `generate-video` (or fal.ai client directly) for each act with the attached refs in parallel.
- Returns `{ story_render_id, act_job_ids[8] }`.

### 4. New edge function `supabase/functions/story-stitch/index.ts`
- Input: `{ story_render_id }`. Verifies all 8 `video_jobs` for that render are `status='done'` and have `video_url`.
- Calls fal.ai's `fal-ai/ffmpeg-api/compose` (server-side ffmpeg concat) with the 8 URLs in `act_index` order, no transitions (cuts), keeps native audio, outputs a single MP4.
- Inserts a 9th `video_jobs` row tagged `provider='stitch'`, `prompt='Stitched: <concept>'`, `video_url=<final>`, `story_render_id` set, `act_index=null`.
- Returns the stitched URL → surfaced as a new `video` bubble.
- Credit cost: 10 credits flat (covers ffmpeg compute); add row to `credit_prices` via migration.

### 5. Database migration
Add to `video_jobs`:
```sql
alter table public.video_jobs add column if not exists story_render_id uuid;
alter table public.video_jobs add column if not exists act_index int;
create index if not exists idx_video_jobs_story_render on public.video_jobs(story_render_id);
insert into public.credit_prices(key, kind, amount, description)
  values ('story_stitch', 'video', 10, 'Stitch 8 acts into one video')
  on conflict (key) do nothing;
```
RLS unchanged (existing `user_id` policies cover the new columns).

### 6. Client changes

**`src/lib/director/api.ts`** — add `submitStoryBundle`, `submitStoryRender`, `submitStoryStitch`, and corresponding `AgentResponse` kinds:
- `generate_story_bundle` (Director announces it; client calls the edge fn)
- `request_story_render`
- `story_stitch_ready` (UI surface)

**`src/components/director/DirectorChat.tsx`** — new bubble types:
- `role: "story_concepts"` — 3 concept chips + key frame thumbnail (rendered from existing `generated_images` payload).
- `role: "location_picker"` — 7 location thumbnails with a drag-drop slot; on drop, calls `submitStoryRender`.
- `role: "story_render"` — strip showing 8 act tiles with live status (queued/processing/done/failed) reusing the existing video polling loop. A "Stitch into one video" button appears when all 8 are done; clicking it calls `submitStoryStitch` and appends a final `role: "video"` bubble with the result.
- Add a single new `<StoryConceptCard>`, `<LocationPickerCard>`, `<ActStrip>` component under `src/components/director/`.

**Existing single-shot flow stays untouched.** The escape chip "Switch to single shot" simply sets a local `storyMode=false` flag on the session and falls back to the existing prompt.

## Cost summary (per story render)
- Assets bundle: 9 images × 5 = **45 credits**
- 8 acts: 8 × Seedance 2.0 (15s) at current `priceFor` = **8 × N credits**
- Stitch: **10 credits**

Shown to the user up front in the existing `ApprovalRequest` dialog at Step 5 (single confirmation covers both render + stitch).

## Verification
1. Brief "2-minute animated video, hero vs monsters" → Director auto-enters story mode; produces opening key frame + 3 concept chips in a single Step 1/2 turn.
2. Pick a concept → aspect question (one card, 3 chips).
3. Pick 16:9 → asset bundle starts streaming (character + prop + 7 locations all render in parallel; no other questions until the location-drop card appears).
4. Drag a location → confirmation dialog shows total credit cost; on confirm, 8 act tiles appear and start polling.
5. All 8 finish → "Stitch into one video" button → final stitched MP4 (~120s) appears as a single video bubble.
6. Regression: a plain "make a 6-second product shot" brief should NOT trigger story mode; existing flow runs unchanged.
7. Escape chip "Switch to single shot" at any story-mode step bails cleanly back into the existing fork.

## Non-goals (this iteration)
- No per-act transitions (hard cuts only). Crossfades can land in v2 once stitching is proven.
- No per-act regeneration UI. If an act fails, the user re-renders the whole story (or we add a per-tile retry in v2).
- Concept editing — the user picks one of 3, they don't edit the loglines (v2).
