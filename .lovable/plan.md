## Goal

Make the Director proactively ask the small set of questions whose answers actually decide **which video model** to pick. Today the model is chosen from the brief + creative answers; we want the agent to explicitly probe the routing-critical axes when they're unknown.

Looking at the model catalog, model choice is decided by 5 axes:

1. **Duration** — 5s (ltx), 6s (hailuo-01/02-std), 8s (veo), 10s (kling/seedance/runway/wan/hailuo-02-pro)
2. **Audio / dialogue** — only veo-3/3.1 and seedance-2.0 support native audio + lip-synced dialogue; everything else is silent
3. **Aspect ratio** — hailuo is 16:9 only; veo-3/3-fast/3.1-lite are 16:9 or 9:16 only; others are flexible
4. **Aesthetic** — photoreal (kling/veo/wan) vs cinematic film-look (seedance/kling-v2-master) vs anime/stylized (hailuo, ltx, wan, seedance-lite)
5. **Motion complexity** — heavy action / long takes (kling-v2.5-turbo, veo-3.1) vs stable subject (kling-1.6, ltx-13b)

The brief usually answers axis 4 (aesthetic) and partially 5. The almost-always-missing ones are **duration, audio/dialogue, aspect ratio**.

## Change

Single-file edit to `supabase/functions/director-agent/index.ts` — extend `SYSTEM_PROMPT` with a new section right before `WHEN YOU GENERATE A PROMPT`:

> MODEL-ROUTING QUESTIONS:
> Before generating a prompt, you MUST know enough to pick a model. The brief usually tells you the aesthetic and motion complexity. The three details that most often decide the model — and that briefs usually omit — are:
> 1. **Duration** — target clip length in seconds (drives 5s/6s/8s/10s model families).
> 2. **Audio & dialogue** — does the shot need spoken lines, sync sound, music, SFX, or is it silent? (veo-3.x and seedance-2.0 are the only audio-capable families.)
> 3. **Aspect ratio / orientation** — 16:9, 9:16, 1:1, or other? (hailuo and several veo variants are constrained.)
>
> Rules:
> - If you have at least 2 of the 3 above, just pick the best fit and generate.
> - If 2 or 3 of them are missing AND the brief is otherwise enough, call `ask_clarification` with one question per missing axis (max 3, in this order: duration → audio/dialogue → aspect ratio). Always include concrete options in the question text so the user can answer in one tap, e.g. "How long should the clip be — 5s, 8s, 10s, or other?" / "Does it need spoken dialogue, ambient sound + music, or fully silent?" / "What aspect ratio — 16:9 landscape, 9:16 vertical, or 1:1 square?"
> - Do NOT ask these routing questions when they're already implied by the brief (e.g. user said "vertical TikTok ad" → 9:16 known; user said "silent loop" → audio known; user said "8-second clip" → duration known).
> - Do NOT mix these routing questions with a media-drop ask in the same batch (see ASK_CLARIFICATION COHERENCE).
> - Echo the user's answers back into `breakdown.duration_seconds`, `breakdown.audio` / `breakdown.dialogue`, and `breakdown.aspect_ratio` (whatever the existing breakdown schema supports), and use them as primary inputs when filling `recommended_model_id` / `recommended_alternatives` / `recommendation_reason`.

## Notes

- The existing `QuestionCard` already detects duration questions and renders preset chips (5s/10s/15s/30s/Other), and `detectSuggestion` already produces chips for audio-style and a generic catch-all — so phrasing questions in this format makes them tap-friendly without any client changes.
- No tool schema, no client, no DB changes. Pure prompt edit + redeploy of `director-agent`.

## Out of scope

- Adding a new `aspect_ratio` chip set in `QuestionCard`. Can do later if the user wants tap-pickers for ratios; today they're answerable via free text or existing chips.
- Changing `recommended_model_id` selection logic — the model list and breakdown already exist.