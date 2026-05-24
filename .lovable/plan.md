# Plan — Free Chat Mode for AI Director

## Goal

Give users an escape hatch from the rigid, scripted Director flow. A simple toggle in the Composer switches the Director between:

- **Director mode** (current): tool-driven, step-by-step, generates sheets/frames/prompts/videos.
- **Free Chat mode** (new): a normal LLM chat. The model answers freely in markdown, can still see uploaded images, but does **not** call any tools, does **not** force step-by-step questions, does **not** generate images or videos.

This solves the "answers feel wrong / confusing" problem when the user just wants to ask a question, brainstorm, or chat.

## UX

1. A small **mode pill** in the Composer toolbar with two options: `Director` (default) and `Free Chat`. Visible at all times, sticky per session.
2. When `Free Chat` is active:
   - Composer placeholder changes to "Ask anything…"
   - Assistant replies render as a normal markdown bubble (`ReactMarkdown`) — no tool cards, no "Step X of Y" headers, no chips.
   - Attachments still upload and are sent to the model for vision.
3. Switching modes mid-session is allowed. History is preserved; the new mode just changes how the next turn is interpreted.
4. Free Chat replies are saved to the same session so the user can scroll back through the mixed conversation.

## Technical approach

### Backend — `supabase/functions/director-agent/index.ts`

- Accept a new optional `mode: "director" | "free_chat"` field on the request body. Default `"director"` to preserve existing behavior.
- When `mode === "free_chat"`:
  - Skip the 1000-line scripted system prompt entirely.
  - Use a short system prompt: "You are a helpful AI assistant for a filmmaker working on generative video prompts. Answer in clean markdown. Be concise. You can see uploaded images. Do NOT call any tools."
  - Send the request to Lovable AI Gateway with **no `tools` array** and **no `tool_choice`** — forcing a plain text completion.
  - Return a new `AgentResponse` shape: `{ kind: "free_chat", text: string }` (or extend the existing union).

### Frontend

- **`src/lib/director/api.ts`** — add `mode` param to `callDirectorAgent` and stream variant. Extend `AgentResponse` type with the free-chat branch.
- **`src/components/director/Composer.tsx`** — add the mode pill; persist selection in component state + localStorage (`director.mode`).
- **`src/components/director/DirectorChat.tsx`** — pass `mode` into the agent call. When the response is `kind: "free_chat"`, render a plain markdown bubble (reuse existing message component if available, else add a small `<ReactMarkdown>` block).
- Persist the free-chat assistant message into `director_sessions.messages` with `role: "assistant"`, `content: text`, and a flag like `freeChat: true` so it renders correctly on reload.

### No DB migration needed

`director_sessions.messages` is already a JSONB array. Free-chat turns slot in alongside existing turns.

## Out of scope

- No image/video generation in Free Chat mode (the whole point is a plain answer).
- No change to existing Director scripts or steps.
- No streaming refactor — Free Chat can use non-streaming `invoke` for v1; streaming can come later.

## Files to touch

- `supabase/functions/director-agent/index.ts` — mode branching, simpler prompt, tool-less call.
- `src/lib/director/api.ts` — type + param.
- `src/components/director/Composer.tsx` — mode pill UI.
- `src/components/director/DirectorChat.tsx` — render free-chat bubble, persist mode flag.
- (optional) `src/components/director/FreeChatBubble.tsx` — small markdown renderer if no reusable one exists.
