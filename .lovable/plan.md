Remove the thin divider line between the two rows inside the composer card at `src/pages/MarketingStudio.tsx`.

The selected element wraps two rows:
- Row 1 (line 587): brand chip + avatar chip
- Row 2 (line 704): Format / Location / Generate ad

The "middle line" is the horizontal hairline separating them, produced by `border-t border-border/30` on the row-2 wrapper. Removing that border (and the `pt-2 mt-1` spacing it pairs with, replaced by a small natural gap) cleans up the visual break so the two rows read as one continuous toolbar.

## Change

`src/pages/MarketingStudio.tsx` line 704: drop `pt-2 mt-1 border-t border-border/30` from the row-2 wrapper, keep `gap-2` and add a small top margin (e.g. `mt-2`) so the rows still breathe.

Before:
```
<div className="flex flex-wrap items-center gap-2 pt-2 mt-1 border-t border-border/30">
```
After:
```
<div className="flex flex-wrap items-center gap-2 mt-2">
```

No other files touched. No logic changes.
