

# Strengthen the AI Director System

Upgrade the system prompt and structured output to produce significantly better cinematic prompts.

## Changes

### 1. Enhanced System Prompt (`supabase/functions/generate-prompt/index.ts`)

**Add scene decomposition instructions** — Force the AI to analyze images in layers before writing prompts:
- Subject/foreground analysis (pose, expression, material, texture)
- Midground/environment context
- Background/atmosphere
- Existing lighting direction and quality
- Dominant color palette and mood

**Add few-shot examples** — Include 1 example output for each workflow type (single, twoframe, multishot) showing the expected quality level and format.

**Deepen model-specific guidance** — Replace surface-level tips with actionable syntax patterns:
- Kling: "Start with subject action verb. Use [camera:movement] bracketed notation. Keep under 200 words."
- Hailuo: "Lead with environment, then subject. Describe motion as continuous flow. 150-300 words optimal."
- Veo: "Use structured format: SCENE → ACTION → CAMERA → LIGHTING. Reference real film techniques by name."
- Sora: "Write as natural prose paragraph. Emphasize physical plausibility. Describe cause-and-effect motion."
- etc. for each provider

**Add negative prompt guidance** — Specific instructions on what to include per model (e.g., "morphing, distortion, blurry, watermark, text overlay, frame jumping").

**Add aspect ratio / duration awareness** — Include a reference section mapping models to their supported resolutions and max durations so prompts can reference appropriate framing.

### 2. Expand Structured Output Schema

Add two new optional fields to the shot schema:
- `suggestedAspectRatio` (string) — e.g., "16:9", "9:16", "1:1"
- `suggestedDuration` (string) — e.g., "5s", "10s"

These give users actionable settings alongside the prompt.

### 3. Switch to `gemini-2.5-flash` 

The current model (`gemini-2.5-pro`) is the most expensive option. For image analysis + prompt writing, `gemini-2.5-flash` delivers comparable results at lower cost and latency. This keeps the app snappy and cost-efficient.

### 4. Update ResultsPanel to show new fields

Display `suggestedAspectRatio` and `suggestedDuration` in the results cards when present.

## Files changed
- `supabase/functions/generate-prompt/index.ts` — Enhanced system prompt, expanded schema, model switch
- `src/components/ResultsPanel.tsx` — Display new fields
- `src/components/WorkflowPanel.tsx` — Pass through new fields in ShotResult type

## What this achieves
- Prompts will be more detailed, model-aware, and production-ready
- Scene analysis becomes systematic rather than freeform
- Users get actionable settings (aspect ratio, duration) alongside prompts
- Lower cost and faster responses with flash model

