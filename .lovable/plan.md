## Issues with New character dialog

1. Identity (Name, Role, Description) is dumped at the bottom under uppercase form-chrome labels with no grouping.
2. The "What does this photo show?" tile pair and the Reference photo dropzone live inside the same `<div>` with no visual separation, so the whole top half reads as one undifferentiated block.
3. All three labels (shot-type, reference, fields) share the same UPPERCASE TRACKING style → no hierarchy.

## Fix (single file: `src/components/marketing/CharacterKitSheet.tsx`)

Mirror the BrandKitSheet card pattern for consistency across the marketing library.

### Reorganize body into 2 grouped cards

Each card = `rounded-2xl border border-border/40 bg-secondary/10 p-4 space-y-4` with a bold title + one-line helper.

1. **Card 1 — Reference photo**
   - Helper: "Pick what the photo shows, then upload a portrait."
   - Subsection: "What does this photo show?" (the two existing Face / Full look tiles)
   - Subsection: Upload (existing dropzone or attached-chip)
   - Existing "Reading…" / "Filled by AI" pill stays inside this card
2. **Card 2 — Identity**
   - Helper: "Used by the Director to describe your character."
   - Name (required)
   - Role (optional)
   - Description (textarea, 0/500)

### Typography
- Card titles: `text-sm font-semibold text-foreground tracking-tight`
- Subsection labels inside cards keep the small uppercase muted style (unchanged)
- Field labels switch from uppercase tracked to plain small `text-[11px] text-muted-foreground` so they don't compete with card titles

### Out of scope
- No changes to save/delete/upload/analyze logic, lightbox, or shot-type analyze re-run.
- No changes to other components.

## Verification
Open Marketing Studio → New character. Dialog should show two clearly bordered cards (Reference photo, Identity), and the Name field no longer looks like a form-chrome label.