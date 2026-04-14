

## Plan: Replace Cinematic Style with Description Box

### Problem
The cinematic style dropdown is confusing for most users who don't know which style to pick. Better to let the AI decide the style based on the image content.

### Changes

**1. Update ConfigPanel** (`src/components/ConfigPanel.tsx`)
- Remove the cinematic style dropdown entirely
- Add a textarea/description box labeled something like "Describe your vision (optional)" where users can type free-form notes (e.g. "slow motion rain scene", "epic drone shot")
- Keep only the Target AI Model dropdown
- Update props: replace `style`/`onStyleChange` with `description`/`onDescriptionChange`

**2. Update WorkflowPanel** (`src/components/WorkflowPanel.tsx`)
- Replace `style` state with `description` state (string, initially empty)
- Pass `description` to the edge function instead of `style`
- Update ConfigPanel props accordingly

**3. Update Edge Function** (`supabase/functions/generate-prompt/index.ts`)
- Remove `style` from required fields validation (make it optional/removed)
- Accept `description` (optional string) in the request body
- Update the system prompt: instruct the AI to analyze the scene and determine the best cinematic style automatically, while incorporating the user's description if provided
- Update the user message to include the description when present

### UI Layout
- Single column: description textarea on top, model selector below
- Textarea placeholder: "Describe your vision... e.g. 'dramatic slow-motion with rain and neon lights'" 
- The description is optional — if left empty, AI purely analyzes the image

