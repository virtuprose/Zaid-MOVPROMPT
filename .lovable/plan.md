## Polish Buy Credits pill spacing & match Assets visual rhythm

The new "Buy Credits" pill currently uses a filled accent fill (`bg-accent/10`) which reads heavier than the outlined "Assets" pill next to it, and the icon/label spacing is slightly off the Assets pill rhythm. Tighten both and match the outline treatment.

### Changes — `src/components/TopNav.tsx`

1. **Match the Assets visual language (outline, not filled)** so the two pills sit as a pair rather than fighting:
   - Replace the Buy Credits classes with: `hidden sm:inline-flex h-9 rounded-full px-3.5 gap-2 text-[13px] font-medium bg-transparent text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/60 transition-colors`
   - Same paddings/gap as Assets so icon-to-label and pill-to-pill spacing line up.

2. **Tighten spacing in the right cluster** so Search → Buy Credits → Assets reads as one row:
   - Bump the right cluster gap from `gap-1.5 sm:gap-2` to `gap-2 sm:gap-2.5` for a touch more breathing room around the two outlined pills (still tight on mobile).

3. **Icon polish**
   - Use `Coins className="w-4 h-4"` (Assets uses 3.5 but Coins reads thin at 3.5; 4 matches optical weight of the folder icon).

4. **Stop the layout from jumping when only Buy Credits is hidden on mobile**
   - Keep the existing `hidden sm:inline-flex`; no wrapper changes needed.

### Out of scope
- No copy changes, no route changes, no new icons elsewhere.
- No changes to the Assets button itself or other TopNav items.