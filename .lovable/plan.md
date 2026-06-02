## Goal
Add a dedicated right-side **Media panel** to the Director, similar to the reference screenshot, that stacks every generated frame and video for the active session in one place — with a type filter (All / Images / Videos) at the top, and a collapse toggle.

## Layout
Update `src/pages/Director.tsx` grid from `[240px_1fr]` to `[240px_1fr_320px]` on `xl` and above. Below `xl`, the right rail collapses to a floating toggle button so chat keeps full width on smaller screens. The panel can be hidden/shown from a small chevron button anchored to its top-left edge (state persisted in `localStorage`).

```
┌──────────┬───────────────────────┬────────────┐
│ Sidebar  │  PlanPanel + Chat     │ Media rail │
│ (tasks)  │  (unchanged)          │ (new)      │
└──────────┴───────────────────────┴────────────┘
```

## New component: `MediaRailPanel`
Location: `src/components/director/MediaRailPanel.tsx`.

Reads the same `director_sessions.messages` + `video_jobs` the chat already loads (passed in via props from `DirectorChat`, no new fetches). It walks the chat bubbles and produces a flat, deduped list of media items:

- **Images** — every `generated_images` bubble's `images[]` (key frames, reference frames, storyboard panels, subject sheets).
- **Videos** — every `video` bubble + any `video_jobs` rows already merged into chat state.

Each item is rendered as a card with:
- Thumbnail (image preview, or video poster + play overlay).
- Small badge for type (`IMG` / `MP4`) and label (e.g. "Panel 3", "Key frame", "final").
- Click → opens existing `PromptInspector` for images or plays inline for videos (reuses `VideoBubble`'s player styles).

Top of the panel:
- Title "Media".
- A segmented `All / Images / Videos` filter.
- Collapse chevron.

Empty state: small muted text "Generated frames and videos for this brief will appear here."

## Wiring
- `DirectorChat.tsx` already holds `bubbles` (chat) and reconciles `video_jobs`. Lift just enough to pass `bubbles` to a sibling rail, or expose via a small zustand-less context (`MediaRailContext`) created in `Director.tsx` and populated from `DirectorChat` via a ref-like callback. Keep changes minimal — no refactor of chat logic, only an effect that publishes `bubbles` to the context on change.
- Inline `GeneratedImageCard` and `VideoBubble` in the chat stay as-is (user didn't ask to remove them). The rail is additive.

## Styling
Use existing tokens (`bg-background`, `border-border/40`, accent cyan ring on hover). Cards: rounded-xl, 1:1 or 16:9 aspect based on item ratio, subtle hover glow consistent with cinematic theme. Scroll container `max-h-[calc(100vh-160px)] overflow-y-auto`. Sticky filter header at top.

## Out of scope
- No backend / schema changes.
- No changes to how media is generated.
- No removal of existing inline previews in chat.
- No download/share actions in this pass (can follow up if you want them).

## Technical details
Touchpoints:
- `src/pages/Director.tsx` — grid update, mount `MediaRailPanel`, provide context.
- `src/components/director/MediaRailPanel.tsx` — new.
- `src/components/director/DirectorChat.tsx` — publish `bubbles` to context (1 effect, no behavior change).
- Reuse: `PromptInspector`, `VideoBubble` styling, design tokens from `index.css`.
