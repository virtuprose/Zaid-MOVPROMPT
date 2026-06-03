# Collapsible left Tasks sidebar

Mirror the close/open behavior shown in the video for the right Media panel, but on the **left "Tasks" sidebar**. The sidebar collapses to a thin icon-only rail and a toggle button in the chat header opens/closes it.

## Behavior

- A small panel-toggle icon (same `PanelLeft` style used on the Media panel) sits at the **top-left of the chat header**, just before the session title.
- Clicking it animates the left aside between two states:
  - **Expanded (default)** — current 240px column with "New Task" button, "Tasks" group header, and the full session list.
  - **Collapsed** — ~56px icon rail showing: logo chip, `+` (New task → `/director`), and a vertical stack of small circular task thumbnails (one per session, active one ringed in accent). Clicking a thumbnail navigates to that task. Hover shows a tooltip with the task title.
- State persists across navigations via `localStorage` key `vidoprompt.tasks-sidebar-collapsed` so it survives route changes inside `/director/:id`.
- Smooth width transition (`transition-[width] duration-300 ease-out`) on the aside; inner content cross-fades between expanded and collapsed views.
- Responsive: behavior only applies at `lg:` and up (unchanged on mobile where the aside is already hidden).

## Technical notes

- File: `src/pages/Director.tsx`
  - Add `const [navCollapsed, setNavCollapsed] = useState(() => localStorage.getItem(...) === "1")` and persist on toggle.
  - Change the grid template from a static `lg:grid-cols-[240px_1fr]` to a dynamic class (`lg:grid-cols-[56px_1fr]` when collapsed, else `lg:grid-cols-[240px_1fr]`).
  - Render two variants inside `<aside>`: the existing expanded markup, or a compact rail (Tooltip-wrapped icon buttons for New Task + each session thumbnail using existing `s.thumbnail` fallback to `MessageSquare`).
  - Pass `navCollapsed` and `onToggleNav` down into `DirectorWorkspace` so it can render the toggle button at the top of its header bar (next to the existing media-panel toggle, mirrored on the left side).
- File: `src/components/director/DirectorChat.tsx` (or wherever the session title header lives)
  - Add a `PanelLeft` icon button at the very start of the header row, identical styling to the media toggle, calling the passed `onToggleNav`.
- No backend, schema, or business-logic changes. Purely presentational.

## Out of scope

- Adding new nav items (Search / Skills / Connectors / Files / Memory) that appear in the reference video — they aren't part of this app.
- Changing the right Media panel behavior.
