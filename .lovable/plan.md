## Problem

When the AI Director replies with a long prompt, the output renders inside a markdown code block (```), and the browser default for `<pre><code>` — reinforced by Tailwind Typography (`prose`) — is `white-space: pre; overflow-x: auto`. Result: the reader has to horizontally scroll a single line for several screens before reading the next one (visible in the earlier screenshot).

The user bubble already uses `whitespace-pre-wrap`, so the issue is isolated to the **assistant markdown branch** in `DirectorChat.tsx` (around line 2755) which renders `<ReactMarkdown>` inside `prose prose-invert`.

## Fix

Force code blocks and inline code rendered by ReactMarkdown to wrap and break long tokens, keeping the monospace look.

### File: `src/components/director/DirectorChat.tsx`

In the assistant markdown branch only, update the `MessageContent` className:

```tsx
b.markdown
  ? "prose prose-invert prose-sm max-w-none break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-hidden [&_code]:whitespace-pre-wrap [&_code]:break-words"
  : "whitespace-pre-wrap"
```

Also add `min-w-0` to the assistant row's `flex-1` wrapper (line ~2751) so the prose container can shrink inside the flex parent:

```tsx
<div className="flex-1 min-w-0">
```

Rationale:
- `whitespace-pre-wrap` on `<pre>` preserves newlines but wraps long lines.
- `break-words` handles single tokens longer than the container (URLs, dense prompts).
- `overflow-x-hidden` removes the residual scrollbar inside the bubble.
- `min-w-0` lets the flex child collapse to the available width on narrow viewports.

## Scope

- Frontend / presentation only.
- Single file: `src/components/director/DirectorChat.tsx`.
- No changes to the Director agent, skills, user bubbles, or other components.

## Verification

1. Open `/director/<existing session>` where the Director returned a long prompt.
2. Confirm the prompt text wraps within the chat column on desktop (1119px), tablet, and mobile widths — no horizontal scrollbar inside the assistant bubble.
3. Confirm the "Send to Director" button still appears below the wrapped block.
4. Confirm monospace formatting and model-emitted line breaks are preserved.
