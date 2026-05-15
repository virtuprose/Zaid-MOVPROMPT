# Director chat — rebuild on AI Elements

Match the reference's clean look (no assistant bubble, subtle user pill, inline interactive question card with chips + Skip/Continue, "Awaiting your input" status, minimal composer with round send button).

## Important scope note

The current Director uses a **custom streaming protocol** (`streamDirectorAgent` → SSE with custom `questions` / `result` events), **not** AI SDK `useChat`. A full data-layer migration to `useChat` + `streamText` + tools would mean rewriting the `director-agent` edge function, the persistence shape, and breaking the multi-shot storyboard / video-job flows.

So "Full reimplementation with AI Elements" is interpreted as: **adopt the AI Elements UI primitives** (Conversation, Message, MessageContent/Response, PromptInput, Shimmer) as the visual shell, while keeping the existing data flow intact. If you actually want the data layer rewritten too, say so — that's a separate, much larger plan.

## Install

```
bun x ai-elements@latest add conversation message prompt-input shimmer
```

## What changes

### `src/components/director/DirectorChat.tsx`
- Wrap the transcript in `<Conversation>` / `<ConversationContent>` / `<ConversationScrollButton>` — drop the manual `scrollRef` + scroll effect.
- Assistant bubbles → `<Message from="assistant">` + `<MessageContent variant="flat">` + `<MessageResponse>` (markdown). No background.
- User bubbles → `<Message from="user">` + `<MessageContent>` styled as a soft rounded pill with `bg-muted/40 text-foreground border border-border/40` (semantic tokens, no hard-coded HSL). Mentions (`@1`, `@2`) and attachment chips keep current rendering.
- Replace the `busy` row with `<Shimmer>Director is reading the brief…</Shimmer>`.
- Add an **"Awaiting your input"** status row (icon + label, accent color) shown only when the most recent bubble is a `questions` card and `!busy` — sits between the question card and the composer.

### New `src/components/director/QuestionCard.tsx`
Inline interactive card replacing the current static numbered list:
- Header: `reason` text in italic accent.
- For each question:
  - Numbered label.
  - **Chip row** (only when the question matches `/duration|length|how long|seconds|how many seconds/i`) with presets `10s, 15s, 30s, 45s, Other`. Selecting a chip fills the answer; "Other" reveals the text input. Non-duration questions skip chips.
  - Single-line text input (semantic tokens) for the answer, with a subtle border that brightens on focus.
- Footer: `Skip` (ghost) + `Continue` (primary, with `⌘ ⇧ ↵` keycap hint).
- `onContinue(answers)` formats answers as `1. <a1>\n2. <a2>` (skipping empty), feeds them into the existing `send()` path with no attachments. `onSkip()` calls `send("Skip", [])`.
- `onSubmit` keyboard shortcut: `Cmd/Ctrl + Shift + Enter`.

Wire in `DirectorChat` inside the bubbles `.map`: when `b.role === "questions"`, render `<QuestionCard reason={b.reason} questions={b.questions} onContinue={...} onSkip={...} disabled={busy} />`. Only the **latest** `questions` bubble is interactive; older ones render disabled.

### `src/components/director/Composer.tsx` — rebuild on `<PromptInput>`
- Outer: `<PromptInput onSubmit={handleSubmit}>` (form).
- Body: `<PromptInputTextarea>` — keep the existing `MentionTextarea` behavior (attachment `@n` mentions, autosize). Wrap or fork `MentionTextarea` so it composes inside `PromptInputTextarea`'s form contract; if the wrap is messy, render `MentionTextarea` directly with the same form `onSubmit` and skip `PromptInputTextarea`.
- Footer (`<PromptInputFooter className="justify-between">`):
  - Left: existing `AttachmentDropzone` trigger as a `+` icon button (`size="icon-sm" rounded-full`) + a small inline model/mode chip (display-only label "AI Director", non-interactive — placeholder for the future model picker).
  - Right: `<PromptInputSubmit status={busy ? "submitted" : "ready"} disabled={cantSend} className="rounded-full h-9 w-9" size="icon-sm" />` (round send / stop button).
- Keep all current logic: moderation gating, busy gating, attachment scanning, mention insertion, helper text. Show helper line below the prompt input only when `showHelper`.

### Patch `src/components/ai-elements/prompt-input.tsx`
Per the abort/cancel guidance in shared knowledge: when `status === "submitted"` show the stop icon (not a spinner). Even though we don't yet wire `onStop`, the visual swap is the right default. Tiny edit.

### Untouched
- `src/lib/director/api.ts`, `streamDirectorAgent`, `director-agent` edge function, `submitVideoJob`.
- `PromptResultCard` (the "result" bubbles) — already a strong custom card; render it as the body of an `<Message from="assistant" variant="full-width">` so it spans the column without an extra background.
- Sidebar, routing, session persistence, video options dialog, attachment ingestion + moderation.

## Technical notes

- All chat colors come from semantic tokens (`background`, `foreground`, `muted`, `border`, `accent`, `primary`). No new HSL literals.
- The user message variant in `Message` is overridden via className to use `bg-muted/40` (the reference shows a low-contrast dark pill, not the project's amber accent).
- Empty state ("STARTERS") stays — render inside `<ConversationContent>` when `bubbles.length === 1`.
- Reset / save dialog and "Switch to structured mode" link stay where they are.

## Out of scope

- Rewriting the streaming protocol to AI SDK `useChat` + `streamText` + tools.
- Real model picker, Usage / Scheduled / Gallery top-bar entries from the reference.
- Threaded URL routing changes (already handled).
- Stop-button wiring (no abort signal in the current API).

## Files

Created:
- `src/components/director/QuestionCard.tsx`
- `src/components/ai-elements/conversation.tsx` (via CLI)
- `src/components/ai-elements/message.tsx` (via CLI)
- `src/components/ai-elements/prompt-input.tsx` (via CLI, then small patch)
- `src/components/ai-elements/shimmer.tsx` (via CLI)

Edited:
- `src/components/director/DirectorChat.tsx`
- `src/components/director/Composer.tsx`
- `src/components/ai-elements/prompt-input.tsx` (spinner → stop icon on `submitted`)
