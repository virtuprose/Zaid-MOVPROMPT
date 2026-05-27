## Goal

Remove the community/featured video grid entirely from `/marketing`. On refresh, your own ads load asynchronously, and during that brief gap the empty-state showed the community grid before flipping to "Your recent ads" — that's the flash. Deleting the grid removes the glitch and de-clutters the page.

## Changes (single file: `src/pages/MarketingStudio.tsx`)

1. **Replace the `mode === "empty"` JSX block** (lines 1324–1338) with a small first-time empty-state card: a title, one-line subtitle ("Attach a product or avatar above, pick a format, and hit Generate."), and no video grid. While `userAds` is still loading on refresh, render nothing (or a lightweight skeleton) instead of the community grid so there is no flash.

2. **Delete the now-unused code:**
   - `loopKitchen / loopCyberpunk / loopDesert / loopPortrait / loopTokyo / loopUnderwater` imports (lines 87–92)
   - `type FeaturedAd` (line 99) and `FEATURED_ADS` constant (lines 107–114)
   - `FILTERS` constant + `filter` state + `FilterTabs` component (lines 116, 149, 1673+)
   - `filteredAds` (line 745)
   - `applyTemplate` (lines 754–760)
   - `showCommunity` state (line 199)
   - `CommunityCard` and `CommunityGrid` components (lines 1726, 1761+)

3. **Track loading explicitly** so the empty-state card only appears once user ads have actually finished loading (e.g., a `userAdsLoaded` flag set after the initial fetch resolves). This is what prevents any flash during the refresh window.

## Out of scope

- No backend changes.
- No changes to the "Your recent ads" mixed/full views.
- The 6 unused `loop-*.mp4.asset.json` files stay in `src/assets/` untouched in case other pages reference them.