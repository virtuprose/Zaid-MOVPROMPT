## Add a path-choice fork before the Director jumps to video

Today, once the user describes the idea, the Director goes straight into the video routing flow (model choice → spec questions → generate_prompt → render). The user wants an explicit fork first:

1. After the initial brief, **ask the user what to do first**: generate a **key-frame image** or go **straight to video**.
2. If they pick **video** → also offer to **drop reference images** (so the video has visual anchors).
3. If they pick **video** → then continue with the existing flow: `ask_model_choice` → routing questions (duration, audio, aspect, resolution, style) → `generate_prompt` → render.
4. If they pick **key-frame first** → use the existing `generate_reference_image` (mode `single_panel`) to produce one hero/key frame, then naturally lead into the video flow afterward (the key frame becomes the anchor reference).

This is a **prompt-only change** to the Director. No new tools, no UI changes, no credit changes — the existing `ask_clarification` tool already renders tap-chips and supports a media-drop ask, and the existing `ask_model_choice` / `generate_reference_image` / `generate_prompt` flow already handles everything downstream.

### Files touched
- `supabase/functions/director-agent/index.ts` — system prompt only.

### What to add to the system prompt

A new top-priority section, placed right after `CORE BEHAVIOR — SMART ONE-SHOT` and before the model-routing rules:

**FIRST-TURN PATH CHOICE (HARD RULE — runs before any model routing):**

- On the **first turn where the user has given a creative brief** (text, voice transcript, or attached references) and you have enough to move forward, your **first response must be `ask_clarification` with ONE question**: "Want me to generate a **key frame** first, or go **straight to the video**?" with chips: `["Generate a key frame first", "Go straight to video", "Upload a reference image"]`.
  - Reason in the `reason` field: "Picking a key frame first locks the look before we commit to a video render."
  - If the user already attached a reference image / video on the first turn, **swap chip 3 for** `"Use the reference I uploaded"`.
  - If the user's brief already explicitly says "make the video" / "render directly" / "skip the keyframe" / names a model id, **skip this fork** and go straight to the existing `ask_model_choice` step.
  - If the user's brief already explicitly says "give me a key frame" / "storyboard first" / "hero shot first", skip the fork and go straight to `generate_reference_image` with `mode: "single_panel"`.

- **Branch A — user picks "Generate a key frame first":**
  - Call `generate_reference_image` with `mode: "single_panel"`, the locked visual spec echoed in `prompt`, and no `reference_urls`. Don't ask model-routing questions yet — the key frame doesn't need them.
  - After the key frame returns, the user's next message will either ask to iterate the frame or to render the video. When they ask for video, fall into Branch B starting at the reference-image ask (the just-generated key frame is the reference, so skip that ask and go straight to `ask_model_choice`).

- **Branch B — user picks "Go straight to video":**
  - **Step B1:** If the user has not attached any reference image yet, your **next** turn must be `ask_clarification` with ONE media-drop question: "Drop 1–3 reference images for the look (or skip)." Chips: `["Skip — text-only"]`. This obeys the existing ASK_CLARIFICATION COHERENCE rule (media-drop question stays alone in its batch).
    - If the user skips or attaches images, go to Step B2.
    - If the user already attached references on the first turn, skip B1 entirely.
  - **Step B2:** Call `ask_model_choice` with `recommended_model_id` + 2 alternatives + `locked_spec` recap (existing rule, unchanged).
  - **Step B3:** After the model is confirmed, ask any remaining routing axes via `ask_clarification` (existing rule, unchanged), then `generate_prompt`, then the user taps render.

- **Branch C — user picks "Upload a reference image" (or "Use the reference I uploaded"):**
  - Treat as Branch B with the reference attached — skip the media-drop ask in B1 and go straight to `ask_model_choice`.

### Wording tweaks elsewhere in the prompt

- In `CONFIRM THE TARGET MODEL BEFORE GENERATING`, add: "Exception 3: if the user just picked 'Generate a key frame first', do NOT call `ask_model_choice` — call `generate_reference_image` instead."
- In `CORE BEHAVIOR — SMART ONE-SHOT`, change "If the brief gives you enough to produce a strong cinematic prompt … use the `generate_prompt` tool. Otherwise ask first." to "If the brief gives you enough to move forward, run the **FIRST-TURN PATH CHOICE** below before anything else. Otherwise ask first."

### Out of scope

- No new tool definitions (we reuse `ask_clarification`, `ask_model_choice`, `generate_reference_image`, `generate_prompt`).
- No frontend changes — `QuestionCard` already renders chips, including a single chip in a batch, and `QuestionUploadSlot` already handles media-drop asks.
- No credit / approval changes — the existing image-generation approval gate (5 credits) still fires when Branch A actually generates the key frame.
- No change to the multi-shot / storyboard / extend-key-frame branches (they keep working as-is after the user has produced a key frame).
