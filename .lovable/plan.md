## Make Director chat fill the viewport height

The chat container is capped at `max-h-[820px]`, so on taller viewports there's a big empty band below the composer. Remove the cap and tighten the height calc so the chat stretches to the bottom of the page.

### Change — `src/components/director/DirectorChat.tsx` (line 302)

- From: `flex flex-col gap-3 h-[calc(100vh-180px)] max-h-[820px]`
- To:   `flex flex-col gap-3 h-[calc(100vh-120px)]`

That drops the hard cap and reduces the top offset (no more in-page header above it since we removed Back/AI Director earlier), so the scrollable messages area + composer + helper link expand to fill the available space.

### Out of scope
- No changes to the composer, message bubbles, sidebar, or page chrome.
- No new responsive breakpoints — the existing `flex-1` on the scroll area already distributes the extra height to the messages list.
