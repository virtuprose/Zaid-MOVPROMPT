## Goal

When the AI Director asks an open-ended creative question (subject, action, mood, camera, lighting, style, etc.), show helpful inline examples + quick-pick chips under the question so users aren't staring at a blank input.

Right now only `duration` questions get presets, and media questions get an upload slot. Everything else just renders a bare text input with placeholder "Enter your answer".

## Changes

### 1. New file: `src/lib/director/questionSuggestions.ts`

Pure function `detectSuggestion(text: string)` returning either `null` or:

```ts
{
  category: "subject" | "action" | "mood" | "camera" | "lighting" |
            "style" | "location" | "time" | "color" | "pacing" | "audio_style",
  example: string,    // shown in placeholder, e.g. "e.g. lone astronaut on a dune"
  chips: string[],    // 5–8 quick picks user can tap to fill/append
}
```

Detection uses regex on keywords already present in Director questions:

| Category | Triggers | Chips (sample) |
|---|---|---|
| subject | "subject", "who", "what is in", "main character" | lone astronaut, vintage car, dancer, neon street, mountain peak, child with kite |
| action | "action", "doing", "happening", "movement" | walking slowly, running, spinning, falling, exploding, embracing |
| mood | "mood", "feel", "tone", "atmosphere", "emotion", "vibe" | melancholic, euphoric, tense, dreamy, mysterious, hopeful, eerie |
| camera | "camera", "shot", "angle", "lens", "framing" | wide shot, close-up, low angle, drone, handheld, tracking, dolly zoom |
| lighting | "light", "lighting" | golden hour, neon, soft daylight, harsh shadows, candlelit, backlit |
| style | "style", "aesthetic", "look", "visual style", "genre" | cinematic, anime, 35mm film, cyberpunk, watercolor, claymation |
| location | "location", "setting", "where", "environment", "place" | tokyo alley, desert, rooftop, forest, underwater, art deco room |
| time | "time of day", "when", "season" | dawn, midday, dusk, night, winter, summer |
| color | "color", "palette", "tones" | warm amber, teal & orange, monochrome, pastel, high-contrast b&w |
| pacing | "pace", "speed", "rhythm", "tempo" | slow motion, real time, fast cuts, gradual buildup |
| audio_style | "music", "sound design", "audio" (only when not a media ask) | ambient pad, lo-fi beat, orchestral swell, no music, sfx only |

Question "main subject, action, or overall mood…" matches multiple — pick the first category in priority order (subject → action → mood → …), and merge chips from the matched categories (capped at ~8).

A second helper `formatPlaceholder(s)` returns the placeholder string.

### 2. `QuestionCard.tsx`

For each question that is **not** a duration question and **not** a media ask:

- Run `detectSuggestion(q)`.
- If non-null:
  - Render a chip row (same visual style as the existing `DURATION_PRESETS` chips) under the question, above the input.
  - Tapping a chip **appends** it to the current answer (comma-separated, no dup) — multi-select friendly. Tapping an active chip removes it.
  - Set the text input `placeholder` to `suggestion.example`.

If `detectSuggestion` returns null, behaviour is unchanged.

No changes to submission format, media slot, duration presets, or any backend logic.

### 3. Nothing else

No edits to `DirectorChat.tsx`, intent system, prompt, or API. UI-only.

## Out of scope

- Asking the LLM to generate examples per-question (would add latency + cost). Static category chips cover the common Director question shapes.
- Reworking duration presets or upload slot.