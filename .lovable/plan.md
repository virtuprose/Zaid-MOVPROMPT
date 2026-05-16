## Status

The current `DirectorChat.tsx` already does exactly what you asked for:

```ts
const isEmpty = bubbles.length === 1 && bubbles[0].role === "assistant";
```

The hero (animated logo + greeting + composer + category tabs + arrow-prefixed suggestions) renders while `isEmpty` is true and collapses into the regular chat stream the moment the user sends their first message — matching your "as soon as user sends first message" choice.

## Plan

No code changes required. Verification only:

1. Open `/director`, confirm the hero shows on load with the floating + glowing logo.
2. Focus the composer → glow speeds up (listening state).
3. Switch tabs (Cinema / UGC / Storyboard / Animate) → 3 arrow-prefixed suggestions swap instantly.
4. Click a suggestion → fills composer, hero still visible.
5. Send the message → hero is replaced by the standard chat scroll layout with the presence header.
6. Click "New brief" reset → hero returns.

If any of these steps fails in the live preview, I'll patch the specific issue. Otherwise the redesign is already meeting the spec.
