

## Responsive UI discovery pass — all logged-in surfaces

Goal: catalogue every layout, overflow, touch-target, and stacking issue across the app at four breakpoints, then hand you a prioritized list to approve before any code changes. No visual restyling — only spacing, sizing, stacking, and target-size fixes are in scope for the follow-up.

### Breakpoints I'll capture

| Class | Width × Height | Represents |
|---|---|---|
| Mobile S | 360 × 800 | Small Android |
| Mobile L | 414 × 896 | iPhone Plus |
| Tablet | 820 × 1180 | iPad portrait |
| Tablet L | 1024 × 768 | iPad landscape |
| Desktop | 1280 × 720 | Laptop |
| Desktop L | 1536 × 864 | Standard desktop |

### Surfaces I'll walk

1. `/auth` — sign-in tab, sign-up tab (with terms error visible), forgot-password mode, OAuth buttons, marketing column.
2. `/` (logged in) — top bar (lang toggle + bell + library + avatar), hero, ImageUploadZone empty + filled, Onboarding examples row.
3. `/` workflow — single frame, two-frame mode, multi-shot mode. SceneBreakdown with elements + Move/Lock badges + notes expanded. Describe textarea with mention popover open. PresetPickerPanel collapsed + expanded + tabbed + searching. ConfigPanel + ModelPicker open. Generate button row. Reset confirm dialog. Enhance dialog with diff. Results panel with scripted prompt expanded + copy buttons.
4. `/library` — empty state, populated grid, detail/open state.
5. Global overlays — WelcomePopup (onboarding 3-step), AnnouncementBanner, NotificationBell dropdown, avatar dropdown, InstallPrompt, OfflineFallback (forced).
6. RTL spot-check — Arabic toggled at Mobile S and Desktop on `/` and `/auth` to catch any `ml-/mr-/left-/right-` regressions.

### Method

- Use `browser--navigate_to_sandbox` + `browser--set_viewport_size` to snap each width.
- For each surface × breakpoint: screenshot, then `browser--observe` to confirm interactive elements are reachable (not clipped, not under another layer).
- Run an automated DOM audit per page: scan for elements wider than viewport (horizontal scroll), buttons/links smaller than 40 × 40 CSS px, text smaller than 12px, fixed widths that overflow, dialogs taller than viewport without scroll, `position: fixed` elements that overlap content on mobile.
- Read browser console logs after each page to surface any layout-warning errors (e.g. ResizeObserver loops, hydration, image aspect warnings).
- Capture sample images into `/mnt/documents/responsive-audit/<surface>-<width>.png` so you can browse them.

### Deliverable

A single triaged report grouped by **severity → surface**, in this format:

```text
P1  Auth / mobile 360 / sign-up form
    Terms error pushes button below fold; card scrolls inside viewport.
    Fix: tighten card padding p-5→p-4 on <sm, reduce social btn h-11→h-10.

P2  Workflow / tablet 820 / SceneBreakdown
    Move/Lock badges wrap onto 3 lines; touch targets 28px (<40).
    Fix: switch to flex-wrap gap-1.5; increase Badge h to h-9 on touch.

…
```

Each item carries: severity (P1 blocking, P2 visible, P3 polish), surface, breakpoint, observed problem, proposed Tailwind fix (class-level, not full code). I'll attach a contact-sheet PNG per surface so you can see all six widths side-by-side.

### What this plan does NOT do

- No code edits — discovery only. After you approve the report, I'll open a follow-up plan to implement the fixes you greenlight.
- No visual restyle (colors, fonts, motion stay the same).
- No new components or dependencies.
- No admin pages, no QA harness (`/qa-mobile`), no auth email previews.
- No OAuth / payment flows.

### Estimated artifact

~30–40 PNGs (6 widths × ~6 key surfaces) + one Markdown report at `/mnt/documents/responsive-audit/REPORT.md`.

