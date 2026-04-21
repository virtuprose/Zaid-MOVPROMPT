

## Consistent icon-only button behavior on mobile

### The problem
On 360–440px viewports, several action rows use `Icon + text` buttons that wrap or push each other:

- **WorkflowPanel — upload phase** (line 501): `Analyze Scene` + `Skip` sit in a centered `flex gap-3` row. `Analyze Scene` is especially long in Arabic and when combined with `Skip` on 360px, they wrap awkwardly or clip.
- **WorkflowPanel — breakdown header** (line 528): `Start Over` + `Re-analyze` in `justify-between` — same problem, both labels can wrap to two lines at 360px.
- **ConfigPanel — describe header** (line 84): `Clear` button sitting next to the section label can wrap the label. Minor but visible in Arabic.
- **SceneBreakdown — element card actions** (line 187): already uses `<span className="hidden sm:inline">` to hide labels on mobile (icon-only). This is the existing pattern we want to standardize everyone to.

### The rule (already partially applied in `SceneBreakdown`)
Secondary / tertiary action buttons that live inside dense rows become **icon-only on mobile, icon + text on ≥sm**. Primary CTAs (Analyze, Generate) keep their label but become **full-width on mobile** when they're alone, or stay side-by-side with **shrunk padding + responsive text**.

Behavior pattern:
1. **Secondary inline actions** (Start Over, Re-analyze, Clear): `<span className="hidden sm:inline">Label</span>` — square-ish tap target on mobile, full pill on desktop. Wrap with tooltip (on desktop) + `aria-label` (always) for a11y. Keep `size="sm"` and add `px-2 sm:px-3` so the mobile square is ~32px.
2. **Primary CTAs in pairs** (Analyze Scene / Skip): keep the label, but:
   - change wrapper to `flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center sm:justify-center`
   - each button gets `w-full sm:w-auto` so they stack on mobile instead of wrapping mid-word
   - tighten padding: `px-4 sm:px-8`
3. **Existing `SceneBreakdown` pattern stays as-is** — this is the reference. No change there except adding the same `aria-label` + tooltip wrapping already present (good), and ensuring `flex-wrap` on the button row degrades gracefully (already there).

### Files & exact changes

**`src/components/WorkflowPanel.tsx`**
- Lines 501–522 (upload CTAs): wrap in `flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center`, add `w-full sm:w-auto` + `px-4 sm:px-8` to both buttons. Keep labels (they're primary). No icon-only collapse.
- Lines 528–546 (breakdown header row): convert `Start Over` and `Re-analyze` to icon-only on mobile. Wrap each in `<Tooltip>` (component already imported elsewhere in this component? — check; if not, skip tooltip and rely on `aria-label` only to keep the diff small), and add `aria-label` + `hidden sm:inline` label span. Set `px-2 sm:px-3`. Keep icons at `w-3.5 h-3.5` — already fine.
- Lines 607–615 (skip-phase `Start Over`): same icon-only-on-mobile treatment as above.

**`src/components/ConfigPanel.tsx`**
- Lines 84–94 (`Clear` button): wrap label in `<span className="hidden sm:inline">` and add `aria-label={t("config.clear")}` + a small `X` icon so it's still recognizable as a clear-action when collapsed. Import `X` from `lucide-react`.

**`src/components/SceneBreakdown.tsx`**
- No structural change needed — already icon-only on mobile. Only tiny consistency tweak: ensure the button row (line 187) uses the same `gap-1 sm:gap-1.5` rhythm and keep `flex-wrap` so two buttons never overflow the card's right edge (already present). Confirm and leave untouched if already correct.

### Tooltip decision
WorkflowPanel does not currently import `Tooltip`. To keep the change focused and avoid a new dependency in that file, the icon-only buttons there will use `aria-label` + `title` (native browser tooltip) — sufficient for "Start Over" / "Re-analyze". SceneBreakdown already has proper Radix tooltips; it keeps them.

### Out of scope
- Icon selection changes (keep existing `RotateCcw`, `ScanSearch`, `Sparkles`, `Zap`).
- Desktop (≥sm) layout — unchanged.
- Any i18n key additions. We reuse existing `wp.startOver`, `wp.reAnalyze`, `config.clear`.
- Changes to `ResultsPanel`, `ModelPicker`, `SceneMentionTextarea` button styles — recently polished.
- Logic, state, generation flow, analytics, auth.

