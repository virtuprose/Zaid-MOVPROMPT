## Remove the chat panel background

The selected panel (line 937) has a dark fill `bg-[hsl(240_8%_5.5%)]`. I'll drop that class so the panel becomes transparent and shows the page background through it.

### Change (`src/components/director/DirectorChat.tsx`, line 939)
- Remove `bg-[hsl(240_8%_5.5%)]` from the className. Keep layout/spacing/border-reset classes intact.