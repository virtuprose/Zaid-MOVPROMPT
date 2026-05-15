## Fix user message bubble for multi-line content

The user bubble in `DirectorChat.tsx` uses `rounded-full`, which turns into an awkward stadium/oval when the content wraps to multiple lines (e.g. numbered answers like "1. wardrobe / 2. room / 3. a heroic sci-fi entrance" in the screenshot).

### Change — `src/components/director/DirectorChat.tsx` (lines ~370–376)

Swap the user bubble shape so single-line stays pill-like and multi-line gets a proper rounded rectangle:

- Replace `rounded-full` with `rounded-2xl` on both the outer `MessageContent` className and the `group-[.is-user]:` overrides.
- Keep `bg-muted/40 border border-border/40 px-4 py-2 text-sm` as-is.
- Single-line short messages still look clean with `rounded-2xl` (16px radius), and multi-line ones no longer balloon.

### Out of scope
- No changes to assistant bubbles, QuestionCard, or composer.
- No copy, spacing, or color token changes elsewhere.
