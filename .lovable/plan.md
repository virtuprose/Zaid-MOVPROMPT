## Goal

When the user sends a message with **only attachments and no text**, don't fire off the Director with a generic "References attached" fallback. Instead, ask them what they want to do with the upload(s), and keep the attachments queued so they can answer and send.

## Behavior

1. User uploads 1+ images (or other files) and hits Send with an empty composer.
2. Instead of calling the agent, the chat appends a local assistant bubble:
   - "What are you looking for? Tell me what you'd like to do with this image so I can help."
   - Localized in `ar.ts` / `en.ts`.
3. A small set of quick-reply chips appears under the question (reuses existing `QuickReplies` component):
   - "Use as a character reference"
   - "Use as a key frame"
   - "Recreate / remix this shot"
   - "Inspire a new scene"
   - Chips just prefill the composer (don't auto-send), so the user can edit before sending.
4. Attachments stay queued in the composer chip row (don't clear them).
5. Once the user types something and sends, the normal `send()` flow runs and the attachments go with that turn.

If the user dismisses the prompt and sends empty again, fall back to the existing behavior (send with "References attached" fallback) so it's not a hard block.

## Changes

**`src/components/director/DirectorChat.tsx`** (`send`, ~line 719):
- Add `const [askedIntent, setAskedIntent] = useState(false);` near the other state.
- At the top of `send()`, after the empty-input guard, branch:
  ```ts
  if (!text && attachments.length > 0 && !askedIntent) {
    setBubbles(prev => [...prev, {
      role: "assistant",
      content: t("director.askIntentForUpload"), // "What are you looking for? ..."
      // optional: attach intent chips via existing quick_replies bubble shape
    }]);
    setAskedIntent(true);
    return; // don't call agent, keep attachments queued
  }
  ```
- Reset `askedIntent` to `false` whenever a send actually completes (or attachments are cleared) so the next upload triggers the question again.
- Render the intent chips: either as a new `quick_replies` bubble next to the assistant bubble, or reuse `QuickReplies` inline. Clicking a chip calls `setInput(chipText)` and focuses composer.

**`src/i18n/translations/en.ts`** and **`ar.ts`**:
- Add `director.askIntentForUpload` and 4 chip labels.

## Out of scope

- No backend / edge function changes.
- No change to the Enter-to-send behavior or composer keybindings.
- Doesn't change behavior when the user types text alongside the upload.