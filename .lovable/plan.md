## Mobile & tablet polish — general pass

Focused, token-driven refinements across the shared surfaces. No layout rewrites, no feature changes — just tighter spacing, better hierarchy, smoother sticky behavior, and consistent tap targets. Desktop stays exactly as it is.

### What gets touched

1. **TopNav (`src/components/TopNav.tsx`)**
   - Compact 52px height on `<md`, reduced horizontal padding, smaller logo wordmark.
   - Right-side cluster: collapse Credits + Bell into a single dense row with proper 44px hit areas.
   - Hamburger sheet: increase row spacing, larger labels, divider between sections.

2. **Workflow upload screen (`src/components/WorkflowPanel.tsx`)**
   - Step indicator (1 UPLOAD — 2 — 3): tighten to a single line with smaller dot + label on `<sm`, more breathing room above/below.
   - Workflow tabs (Single / Start+End / Multi-shot): equal-width segmented control on mobile so the active pill doesn't dwarf the others; smaller text, consistent 36px height.
   - "Pick your target AI model" card: reduced padding on mobile, tighter description line-height.
   - Dropzone: shorter min-height on mobile (so the sticky console doesn't overlap), softer dashed border, larger upload icon.

3. **Sticky cinema console (bottom bar) — shared component**
   - Add safe-area inset padding (`env(safe-area-inset-bottom)`) so it sits above the iOS home indicator.
   - Slightly reduce height on mobile; ensure the Generate CTA is full-width and 48px tall.
   - Add a subtle top gradient mask so content fades into it instead of being abruptly clipped.

4. **Marketing Studio (`src/pages/MarketingStudio.tsx`)**
   - Brand/Character picker popovers: full-width sheets on `<sm` (already partly responsive — normalize padding and row gap).
   - Section headers: smaller display size on mobile, consistent uppercase tracking.

5. **Library & Landing**
   - Card grids: tighten gap from `gap-6` → `gap-4` on `<sm`; ensure no horizontal scroll.
   - Hero headlines on Landing: drop one size step on `<sm` for better balance.

6. **Global tokens (`src/index.css`)**
   - Add a `--mobile-page-padding` token (`16px` mobile, `24px` tablet, existing on desktop) and apply to page shells so spacing is consistent.
   - Tighten body line-height on `<sm` from 1.6 → 1.5 for denser, more app-like feel.
   - Ensure all interactive elements meet 44px min tap target via a utility class `.tap-target`.

7. **Install MovPrompt banner**
   - Already exists; reduce vertical padding, smaller icon, allow dismiss button to be properly tappable.

### Out of scope

- No new components, no copy changes, no behavior changes.
- No changes to AI flows, backend, or auth.
- No light-mode work beyond what tokens already cover.

### Verification

After edits, I'll spot-check three viewports in the preview — 390×844 (iPhone), 820×1180 (iPad portrait), 1097×891 (current desktop) — to confirm nothing regressed.
