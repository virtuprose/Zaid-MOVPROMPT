

# Replace AI Model List with Updated Models

## What
Replace the current model list with the complete set from the uploaded document. This affects the frontend dropdown, backend validation, model labels, and system prompt.

## New Model List (from uploaded file)

| Family | Models |
|--------|--------|
| Minimax Hailuo | 2.3 Fast, 2.3, 02 Fast, 02 |
| Kling | 3.0, 3.0 Omni, 3.0 Omni Edit, 2.6, O1 Video, O1 Video Edit, Motion Control, 3.0 Motion Control |
| Sora | Sora 2, Sora 2 Pro, Sora 2 Max, Sora 2 Pro Max |
| Google Veo | 3.1 Lite, 3.1 Fast, 3.1, 3 Fast, 3 |
| Higgsfield | Lite, Standard, Turbo |
| Wan | 2.7, 2.6, 2.5, 2.5 Fast, 2.2, 2.2 Fast |
| Seedance | 2.0 Fast, 2.0, 1.5 Pro, Pro, Pro Fast |
| Grok | Imagine, Imagine Edit |

**Removed**: Runway, Luma, Pika, Stable Video, Genmo, PixVerse, Haiper, Vidu, CogVideoX

## Files Changed

### 1. `src/components/ConfigPanel.tsx`
- Replace `MODEL_GROUPS` array with new groups and models
- Each model gets a unique value key (e.g. `hailuo-2.3-fast`, `kling-3.0-omni`, `veo-3.1-lite`)

### 2. `supabase/functions/generate-prompt/index.ts`
- Update `ALLOWED_MODELS` set with all new model value keys
- Update `modelLabels` map with display names
- Update `SYSTEM_PROMPT` model-specific guidance section:
  - **Hailuo**: Emphasize fluid motion, character consistency, detailed scene description
  - **Kling**: Focus on subject motion, action verbs, explicit movement direction. Edit variants for video editing prompts. Motion Control for camera path descriptions
  - **Sora**: Natural language, emphasize physics and realism. Pro/Max variants for higher quality
  - **Veo**: Structured and precise, reference real cinematography techniques
  - **Higgsfield**: Short-form focused, concise motion descriptions
  - **Wan**: Cinematic language, lighting and atmosphere emphasis
  - **Seedance**: Dance-like fluid motion, rhythmic transitions, expressive movement
  - **Grok**: Creative visual generation, stylized outputs. Edit variant for video editing

## Technical Details

- ~37 individual models across 8 families
- Value keys use kebab-case: `{family}-{version}` pattern
- Edit models (Kling O1 Video Edit, Kling 3.0 Omni Edit, Grok Imagine Edit) will be noted in model tips as designed for editing existing videos
- Resolution and duration info from the document will be included in `modelNotes` guidance in the system prompt

