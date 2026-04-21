

## Mobile UI QA checklist + regression test

### Goal
Give the team a fast, repeatable way to verify the main flow (upload → breakdown → generate) renders correctly on 360–440px viewports without running the full auth/generation stack.

### Scope
Two additions — **no changes to existing app logic or routes that real users hit**:

1. **`/qa/mobile` regression route** (dev-only in navigation, but reachable in prod by URL)
   - A single page that renders the three critical UI surfaces back-to-back with mocked data, so a human can scroll and eyeball them at 360/390/414/440px without needing to sign in, upload images, or call edge functions.
   - Sections:
     1. **Top bar + ModelPicker** — renders `ModelPicker` with state, shows the new flash/selection feedback.
     2. **Upload phase** — renders `ImageUploadZone` in its empty state + a mock "with image" state.
     3. **Breakdown phase** — renders `SceneBreakdown` with 3 mock elements and `SceneMentionTextarea` wired to them (so the popover + empty-state can both be exercised by clearing elements).
     4. **Generate / Results phase** — renders `ResultsPanel` with 2 mock `ShotResult`s (one expanded, one collapsed) to verify collapsible padding, copy buttons, and wrapping.
   - Each section has a small sticky header with the section name + a viewport-width readout (`window.innerWidth`) updated on resize so testers can confirm they're at the intended breakpoint.
   - A "QA checklist" card at the top lists the things to visually verify (below), with checkboxes (local state only) so a tester can tick them off during a pass.

2. **Vitest smoke test** `src/components/__tests__/ModelPicker.test.tsx`
   - Renders `ModelPicker` inside the existing `LanguageProvider`, asserts the trigger is present, and asserts changing the model via `onModelChange` updates the selected label. This locks in the recent mobile polish changes (trigger min-height, flash state) against accidental regressions — the state logic and DOM structure must keep working.
   - Uses the existing vitest setup (`src/test/setup.ts`, `vitest.config.ts`) — no new infra.

### QA checklist (rendered on `/qa/mobile` and documented here)

At 360px, 390px, 414px, 440px verify:

- [ ] Top bar buttons don't wrap or overflow; no horizontal scroll on the page.
- [ ] `ModelPicker` trigger shows selected model + description on two lines, no clipping.
- [ ] Opening `ModelPicker` popover stays within viewport; list scrolls; sticky group headers visible; selected row has left accent bar.
- [ ] Selecting a new model flashes the ring on the trigger briefly.
- [ ] `ImageUploadZone` empty state: icon + copy centered, CTA full-width-ish but not overflowing.
- [ ] `SceneBreakdown`: element cards don't overflow; action buttons wrap cleanly; long descriptions truncate / wrap without pushing layout.
- [ ] `SceneMentionTextarea` pill row doesn't overflow; popover fits `calc(100vw-2rem)`; empty-state renders when elements are cleared.
- [ ] `ResultsPanel`: header wraps cleanly; collapsibles expand/collapse; copy buttons reachable with thumb.
- [ ] No text clipped by rounded card corners; no elements under the iOS home indicator area (bottom 24px padding respected where needed).

### Files

**New**
- `src/pages/QaMobile.tsx` — the QA page, entirely client-side, uses real components with mock data.
- `src/components/__tests__/ModelPicker.test.tsx` — smoke test.

**Edited**
- `src/App.tsx` — add the `/qa/mobile` route (public, no `AuthGuard`). Keep it undiscoverable from the main UI (no nav link) so it doesn't leak into user-facing flows.

### Mock data shape

- **Elements** for `SceneBreakdown` / `SceneMentionTextarea`: 3 items with indices 1/2/3, mixed categories (`character`, `object`, `environment`), realistic 1–2 sentence descriptions.
- **Shot results** for `ResultsPanel`: 2 items with varying `targetModel` (e.g. `"veo-3"`, `"any"`) and prompts of ~80 and ~400 chars to exercise truncation/wrap.
- A "Reset / Clear elements" button on the breakdown section so the tester can toggle `elements=[]` and see the `SceneMentionTextarea` empty-state popover.

### Out of scope
- No browser automation / visual regression snapshots (no Playwright, no Percy).
- No changes to the real `/` flow, generation pipeline, auth, or i18n keys.
- No backend, analytics, or RLS changes — the QA page is purely a static harness around existing components.
- Desktop layout unaffected; the page itself is responsive but tuned for small viewports.

