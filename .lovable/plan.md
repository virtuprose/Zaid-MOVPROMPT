## Restyle QuestionCard to a soft borderless panel

Match the screenshot: subtle muted background, no visible border, lighter type weights, pill chip options, inline rounded input. Replace the look everywhere the questions bubble renders in DirectorChat.

### Changes — `src/components/director/QuestionCard.tsx`

1. **Container** — drop border, soften background:
   - From: `rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5 space-y-4`
   - To:   `rounded-2xl bg-muted/15 p-5 sm:p-6 space-y-5` (no border, slightly more padding for breathing room)

2. **Reason line** — keep accent italic but ensure no bold:
   - `text-xs text-muted-foreground/80 italic` (drop accent tint so the panel reads softer; keeps it secondary)

3. **Question label** — lighter weight, muted number:
   - Wrapper: `text-sm text-foreground/90 font-normal`
   - Number: `text-muted-foreground/70 mr-1.5`

4. **Duration chips** — softer inactive, keep active subtle:
   - Inactive: `border border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60 bg-transparent`
   - Active:   `bg-foreground/10 border border-border/50 text-foreground`
   - Same `rounded-full px-3 py-1 text-xs transition-colors`

5. **Text input** — borderless, sits on subtle inner surface:
   - From bordered pill to: `w-full rounded-full bg-background/30 border border-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:bg-background/50 focus:border-border/40 transition-colors`

6. **Footer buttons** — keep current Skip/Continue layout, but ensure Continue is not heavy:
   - Continue button: `rounded-full gap-2 bg-foreground/10 text-foreground hover:bg-foreground/15 border border-border/30` (replace default solid primary so the panel stays soft)
   - Skip stays as ghost.

### Out of scope
- No new component file; we're restyling in place since the user chose "replace visually everywhere."
- No changes to DirectorChat wiring, props, or behavior (Enter shortcuts, focus, submit logic untouched).
- No changes to VideoOptionsDialog or other panels.
- No new chip presets or new question types.

### Technical notes
- All colors use existing semantic tokens (`muted`, `foreground`, `background`, `border`) — no raw hex.
- `font-semibold`/`font-bold` are not introduced anywhere in the new styles.
- File stays a single component; no API change so DirectorChat at line 349 keeps working without edits.
