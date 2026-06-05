# Make Director Activity reflect the real work, not a fixed 5-step scaffold

Today every turn emits the same 4-5 rows up front (read-brief, mine-freechat, skill, preflight, thinking) plus one row per tool call. The user sees "5 steps · 10s" no matter what was actually done.

This plan replaces the static scaffold with steps tied to the actual work the Director performs for THIS turn.

## Principles

1. **Earned, not announced.** A row only appears once that work begins. No more "5 steps" before the model has done anything.
2. **Granularity matches the brief.** A plain-text follow-up shows ~2 rows. An image-anchored first turn shows attachment analysis, subject detection, model routing, prompt composition. Story mode shows its real 5-stage pipeline. Retries and skill loads show their own rows.
3. **Status reflects reality.** `running` while it's happening, `done` when it finishes, with a real `detail` payload when there's something worth expanding.

## Step taxonomy (final set)

Keep existing kinds (`reading | mining | skill | preflight | thinking | reference | model | prompt | error`) and add:

- `attachment` — "Analyzing 2 images" / "Reading the uploaded PDF" / "Pulling key frames from video"
- `routing` — "Routing to the Veo expert" / "Skill matched: cinematic-ad-veo3"
- `retry` — "Retrying after a hiccup (2/3)"

## Edge function changes — `supabase/functions/director-agent/index.ts`

Replace the static `steps.push(...)` block (lines 1229-1266) with conditional emission:

- Drop `read-brief` as a standalone row when the brief is empty or trivial (≤ 12 chars). When kept, only render if there's a `detail` worth expanding.
- Drop the always-on `preflight` row. Emit it only when the agent's system prompt actually has unresolved axes to check (i.e. when `sessionState` shows missing required axes). Label it with what was checked: "Pre-flight: aspect, duration, audio".
- `mine-freechat` — keep only when there are ≥ 2 prior user turns AND the recap added new info beyond the latest brief.
- `skill` — keep, but emit as `running` first, then `done` when the skill payload has been merged into the system prompt (currently emitted as instant-`done`, which gives no sense of work).
- `attachment` — NEW. When `mergedAttachments` has entries, push one row per attachment kind with a `running → done` transition around the moment the model starts streaming (proxy for "model has now ingested these"). Detail = filenames / counts.
- `thinking` — keep, but only emit when the first model byte takes > 600ms (otherwise it flashes uselessly).
- Pass through skill load + retry events as they happen rather than collapsing them into a single header.

## Client changes — `src/components/director/DirectorChat.tsx`

Lines 1789-1808 (`handlePartial` tool-kind branch) become finer:

- `generate_reference_image` — split into two rows: `reference / running` ("Drafting a reference key frame") on tool-call detection, then `reference / done` when the resulting bubble's `imageUrl` actually resolves (currently it instant-marks done before the image returns).
- `generate_story_bundle` — emit one row per asset bundle slot (character, prop, 7 locations) as they stream in.
- `generate_prompt` — keep the `running` row, but mark it `done` only when the full prompt (not just the title) has streamed.
- `ask_model_choice` — add a sibling `routing` row that names the recommended model + reason.

Also: when `streamDirectorAgent` retries (the existing `MAX_ATTEMPTS = 3` loop, line 1854), push a `retry` row labelled "Retrying after a hiccup (attempt N/3)" with the error as `detail`.

## Story-mode wiring — `supabase/functions/director-agent/index.ts` + `DirectorChat.tsx`

Story mode already has a real 5-step pipeline in the system prompt (lines 109-123). Wire each story step to its own activity row so the feed mirrors the visible script:

1. "Story step 1/5 — opening key frame + 3 concepts" — `reference`
2. "Story step 2/5 — pick a concept" — `thinking`
3. "Story step 3/5 — aspect ratio" — `thinking`
4. "Story step 4/5 — building 1 character + 1 prop + 7 locations" — `reference` (with sub-row per asset as they land)
5. "Story step 5/5 — launching 4 parallel renders" — `prompt`

These should be emitted from the same `handlePartial` based on tool call (`generate_reference_image` with `mode: "single_panel"` → step 1, `generate_story_bundle` → step 4, `request_story_render` → step 5) plus user-turn shapes for steps 2 and 3.

## Header label

`DirectorActivityFeed.tsx` already shows `{visibleSteps.length} steps · {elapsed}s`. No change needed — once steps reflect real work, the count and duration will vary naturally.

## Out of scope

- No new edge functions.
- No DB / migration changes — activity is ephemeral, not persisted as structured rows.
- No visual redesign of the activity card itself (the sequential typing + reveal animation from the previous turn stays as-is).
- We do NOT add fake "Step 1 of N" counters in single-shot flows (the system prompt rule at line 67-70 forbids this) — only story mode keeps explicit numbering.

## QA checklist

- Plain text turn with no attachments → ~2 rows (`thinking`, then the tool-call row).
- First turn with an image upload → `attachment` (running → done), `routing` / `skill` if matched, `thinking`, then `reference` (running until image returns), then `prompt` if applicable.
- Story mode → 5 sequential story rows, with sub-rows under step 4.
- Stream that hits one retry → `retry` row appears between `thinking` and the resolved tool row, with the error in the expandable detail.
- Reduced-motion users still see the same content, just without the typewriter animation (handled already).
