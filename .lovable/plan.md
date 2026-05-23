## Issues

Looking at the New Product dialog:

1. **Type segmented control is broken** — it has only one option ("Product"), rendered as a full-width amber pill that looks like a clicked button, not a control. Provides no value.
2. **Information architecture is upside down** — Type → Image → Angles → Spec Sheet → Name (required) → Description → Tagline → "What the AI sees". The thing the user came to do (name a product) is buried near the bottom.
3. **No visual grouping** — eight section labels stacked in a long flat scroll. Hard to scan where one concept ends and another begins.
4. **Density** — uppercase tracked SECTION labels mixed with smaller field labels mixed with helper paragraphs all share similar weight.

## Fix (single file: `src/components/marketing/BrandKitSheet.tsx`)

### Reorder the body into 3 clearly grouped cards

Each card = `rounded-2xl border border-border/40 bg-secondary/10 p-4 space-y-4` with a single bold card title and an optional one-line helper.

1. **Card 1 — Product basics**
   - Name (required) — first field, prominent
   - Tagline (optional)
2. **Card 2 — Visuals** (was 3 separate stacked sections)
   - Subsection: Main image (the existing Upload / Image URL toggle + drop zone or chip)
   - Subsection: Additional angles · `0/5` counter on the right
   - Subsection: Spec sheet · optional
3. **Card 3 — Detailed description** (used by Director)
   - Detailed description textarea
4. **Card 4 — What the AI sees** (unchanged ProductFactSheet, already its own card)

### Remove the Type control
Single-option "Product" segmented control deleted. `draft.subject` keeps defaulting to "product" in state — no functional change.

### Tighten typography
- Card title: `text-sm font-semibold text-foreground` + a tiny muted helper line right under it (replaces the all-caps SECTION LABELS that look like form chrome).
- Field labels inside cards remain small muted (`text-[11px] text-muted-foreground`).

### Out of scope
- No changes to backend, save logic, upload pipeline, analyzer, references model, or any other component.
- No changes to popovers, picker, marketing studio page, or character kit sheet.
- Same primitives, same fields, same data — only ordering, grouping, and the deleted single-option Type control.

## Verification

Open Marketing Studio → click "New product". The dialog should:
- show Name as the first field
- show 3 clearly bordered/padded sections with bold titles
- no orange "Product" button that pretends to be a control
- still save/edit/delete exactly as before