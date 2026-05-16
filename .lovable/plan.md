## Goal

When the Director uses `ask_clarification` and one of the questions asks the user to drop/share an image, video, or file, every other question in that same batch must be **about that media** — not unrelated creative topics.

Example of the desired behaviour:

- Q1: "Drop a reference image of the location you have in mind."
- Q2: "What in that image is most important to keep — the color palette, the architecture, or the mood?"
- Q3: "Should the final shot match that reference's lighting, or just its composition?"

Today the agent often pairs an upload ask with an unrelated question (e.g. "drop a reference image" + "what duration do you want?"), which feels disjointed.

## Change

**Single-file edit to `supabase/functions/director-agent/index.ts`** — extend `SYSTEM_PROMPT` with a new rule under `CORE BEHAVIOR — SMART ONE-SHOT`:

> ASK_CLARIFICATION COHERENCE:
> - If any question in the batch asks the user to drop/share/upload an image, video, audio, or file, every other question in the same batch MUST be about that media (what to extract from it, what to imitate, what to ignore, framing, palette, mood, pacing, sound, etc.).
> - Do NOT mix a media-drop ask with unrelated topics like duration, aspect ratio, model choice, or off-topic creative questions in the same batch. Save those for a follow-up turn after the media arrives.
> - If you need both media AND an unrelated detail, prefer asking only the media question first (1 question is fine).

No code/tool-schema changes, no client changes. Pure prompt update so future `ask_clarification` calls emit a coherent media-focused batch.

## Out of scope

- Client-side reordering or filtering of questions (we trust the LLM once the rule is in the prompt).
- Changes to `generate_prompt` or `request_video_generation`.
- UI changes — the existing upload slot + suggestion chips already render correctly once questions are coherent.