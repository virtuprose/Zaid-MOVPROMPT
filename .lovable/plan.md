

# Add "Any Model" Default Option to Target AI Model Dropdown

## What
Add a generic "Any Model" option at the top of the model dropdown that generates a universal prompt not optimized for any specific model. Make it the default selection.

## Changes

### 1. `src/components/ConfigPanel.tsx`
- Add an "Any Model" `SelectItem` before the model groups in the dropdown (value: `"any"`, label: `"Any Model — Universal Prompt"`)
- Add a `SelectSeparator` after it to visually separate from specific models

### 2. `src/components/WorkflowPanel.tsx`
- Change default model state from `"runway"` to `"any"`

### 3. `supabase/functions/generate-prompt/index.ts`
- Add `"any"` to `ALLOWED_MODELS` set
- Add `"any"` to `modelLabels` map
- Update system prompt to handle `"any"` — generate a model-agnostic prompt that works well across all video AI models, without model-specific optimizations

