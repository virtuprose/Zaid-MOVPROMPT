## Goal

Make the Director's model selection dramatically more reliable by combining: few-shot grounding, a hard server-side safety net, runtime context the LLM can't infer, richer per-model fields (including how to *prompt* each model), a transparent decision trace, multi-shot consistency, and an explicit fallback contract. One file is the source of model truth across frontend + edge.

All work is server-side except a tiny shared module + a small client tweak to pass optional session context.

---

## 1. Shared catalog — single source of truth

**New file:** `supabase/functions/_shared/videoModelCatalog.ts`

Move the capability schema (`id, family, label, audio, maxDurationSec, maxResolution, aspects, speed, cost, strengths`) out of `src/lib/director/videoModelCatalog.ts` into the shared module, and re-export it from the frontend file so existing imports keep working. The edge function imports the same module and *extends* each entry with director-only fields (`bestFor`, `cannotDo`, `preferWhen`, `promptDialect`). Drift between picker UI and agent disappears.

## 2. Richer per-model fields

Extend each playbook entry with:

- **cannotDo** (string[], hard constraints used in Step 2 — e.g. Hailuo: `["aspect:9:16","aspect:1:1","aspect:21:9","aspect:4:3","aspect:3:4"]`, Veo-3: `["duration:!=8"]`, Kling Motion Control: `["audio"]`). These are machine-checkable, not just prose.
- **promptDialect** (1–3 lines) — how to shape the prompt text once this model is picked:
  - Veo family: "Wrap spoken lines in double quotes, name the speaker, keep dialogue short, include ambient SFX in parens."
  - Seedance: "Lead with film-stock + grade (e.g. '35mm Kodak Vision3 250D, teal-orange grade'), then lens, then shot."
  - Kling v3 / Omni: "For multi-beat shots, decompose into numbered beats (1. … 2. …). Mention named characters/elements with @Name."
  - Kling Motion Control: "Describe only the *appearance* of the reference subject; motion comes from driving video — do not describe motion."
  - Kling Omni Edit: "Describe the *target* style/look; do not redescribe the source action."
  - Hailuo / LTX / Wan / Runway: 1-liner each.
- **cost** and **speed** already exist on the frontend catalog — surface them in the playbook block so the agent can reason about draft vs hero.

`cannotDo` and `bestFor` stay human-readable; the algorithm references them by name.

## 3. Runtime session-context block (server-injected)

Right before serializing the system prompt, compute a deterministic block from the incoming request and prepend it to the user message (or append to system prompt):

```
═══ SESSION CONTEXT ═══
ATTACHMENTS: {N} images, {N} video_keyframes, {N} audio_transcripts, {N} documents
SOURCE VIDEOS FOR EDIT: {0|1}    (true only when an attachment is tagged source_video)
DRIVING VIDEOS FOR MOTION: {0|1} (true only when explicitly tagged)
SHOT INDEX: {0|N}                (0 = first/only shot; >0 = continuation)
PREVIOUS PICK: {model_id|none}   (only for shot_index > 0)
DETECTED MODE: draft | hero      (draft if last user message contains test/draft/preview/quick; hero if final/publish/hero/print)
```

To support this:
- Client (`src/lib/director/api.ts` `runDirector`) gains an optional `context: { shot_index?, previous_recommended_model_id?, mode?, source_video?, driving_video? }` argument forwarded in the POST body. Defaults preserve current behavior.
- Edge function reads `body.context` and computes the block. If client doesn't send it, all fields default to safe values (0 / none / draft).

The algorithm now references this block by name ("If SOURCE VIDEOS FOR EDIT = 1, only `kling-omni-edit` qualifies").

## 4. Few-shot worked examples in the system prompt

Add a `═══ WORKED EXAMPLES ═══` block with 6 compact cases. Each shows: brief, session context, the trace, and the JSON tool call. Examples chosen to cover the failure modes we see today:

1. Vertical TikTok with spoken voiceover → `veo-3.1` (forced by audio + 9:16 in 8s).
2. 21:9 anamorphic film-look establishing shot → `seedance-2.0` (only family with 21:9).
3. Anime portrait 16:9 → `hailuo-02-pro`.
4. "Restyle this clip into anime" + source_video attached → `kling-omni-edit` (input gate decides).
5. Multi-shot storyboard with 2 named characters → `kling-omni`; shot 2 of same storyboard keeps the same pick.
6. Impossible combo (12s + dialogue + 1:1) → fallback contract triggers: relax aspect → `kling-v3-pro` (15s, audio, 1:1 supported), with one-line warning in `directors_note`.

Examples are short (≤ 6 lines each) so token cost stays bounded.

## 5. Explicit fallback contract

Append to the algorithm:

```
STEP 2b — Fallback when zero candidates survive Step 1+2:
  Relax constraints in this exact order, stopping as soon as ≥1 candidate survives:
    1. drop aspect ratio (substitute nearest supported ratio)
    2. drop audio (silent backup)
    3. drop duration (cap to the candidate's max)
  When any constraint was relaxed, prepend a single sentence to
  directors_note: "Note: no model supports {original combo}; relaxed {what} to {value}."
```

## 6. Multi-shot consistency rule

Append to the algorithm:

```
STEP 0 — Multi-shot consistency:
  If SESSION CONTEXT shows SHOT INDEX > 0 and PREVIOUS PICK is set,
  default recommended_model_id to PREVIOUS PICK unless capability
  gating (Step 2) eliminates it OR the shot's input mode differs
  (e.g. shot 1 was text-to-video, shot 2 attached a source video).
```

## 7. Selection trace field

Extend the `generate_prompt` tool schema with:

```ts
breakdown.selection_trace: string[]  // 2–4 short lines, one per step
```

Required when `recommended_model_id` is set. The system prompt requires the trace to mirror the algorithm steps in order. Optional frontend disclosure can render this under "Why this model?" — out of scope for this plan, the field just gets stored on `director_sessions.breakdown`.

## 8. Server-side validation + auto-correction

After parsing the `generate_prompt` tool call, before responding to the client:

```
1. Look up the playbook entry for breakdown.recommended_model_id.
2. Validate against the resolved session context + breakdown:
   - duration ≤ entry.duration max
   - requested aspect ∈ entry.aspects
   - if breakdown.audio/dialogue required → entry.audio !== "none"
   - if input gate applied (source_video / driving_video) → entry matches
3. If validation passes → return as-is.
4. If validation fails → rerun the algorithm server-side over the playbook,
   pick the top survivor, overwrite recommended_model_id and
   recommended_alternatives, prepend a one-line note to directors_note:
   "Auto-corrected from {bad_id} to {good_id} ({reason})."
5. If still nothing survives → apply Step 2b fallback contract programmatically
   with the same auto-correction note.
```

Two outcomes: the LLM picks well and we pass through, OR the LLM slips and we deterministically fix it. Either way the client always gets a valid pick.

A small pure helper `pickBestModel(constraints, playbook)` implements Steps 1–3 of the algorithm in TypeScript and is reused by both the auto-correction path and the fallback path.

---

## Files touched

- **New** `supabase/functions/_shared/videoModelCatalog.ts` — shared capability schema + per-model entries with the extended fields.
- **Edit** `src/lib/director/videoModelCatalog.ts` — re-export from the shared module; remove the duplicated data (frontend imports stay identical).
- **Edit** `supabase/functions/director-agent/index.ts` —
  - Replace inline `MODEL_PLAYBOOK` with import from shared module + director-only extension table.
  - Add `pickBestModel()` helper.
  - Inject SESSION CONTEXT block per request.
  - Append WORKED EXAMPLES, STEP 0, STEP 2b to the system prompt.
  - Add `selection_trace` to the `generate_prompt` tool schema (required when `recommended_model_id` is set).
  - Add post-tool-call validation + auto-correction.
- **Edit** `src/lib/director/api.ts` — `runDirector` accepts optional `context` and forwards it.
- **Edit** `src/components/director/DirectorChat.tsx` — pass `mode` (inferred from last message keywords) and, when in storyboard workflow, `shot_index` + `previous_recommended_model_id`. Single small site.
- **Deploy** `director-agent` after the edits.

## Out of scope

- Frontend "Why this model?" disclosure UI (trace is stored, not yet rendered).
- Token diet (split-by-mention).
- Telemetry loop on accepted vs overridden picks.
- New input plumbing for Omni Edit / Motion Control uploads (separate workstream).