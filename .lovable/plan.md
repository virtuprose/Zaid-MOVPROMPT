## Tighten Ads Studio (`/marketing`) — alignment & spacing

Looking at the page, the composer is centered at `max-w-4xl` inside a `max-w-7xl` container, but the recent-ads gallery stretches edge-to-edge. The hero also has too much vertical breathing room and is huge.

### Changes (`src/pages/MarketingStudio.tsx`)

1. **Hero** (line 548–555)
   - `mb-6` → `mb-5`
   - Headline `text-[32px] sm:text-[44px]` → `text-[28px] sm:text-[36px]` so it stops dominating the viewport.

2. **Composer width** (line 559)
   - `max-w-4xl mx-auto` → `max-w-5xl mx-auto` (gives the two-column selectors room and aligns with gallery below).

3. **Gallery alignment** (line 770)
   - Wrap the `<section ref={galleryRef} …>` content in a `max-w-5xl mx-auto` container so the "Your recent ads" grid and the section header line up with the composer instead of stretching to 7xl.
   - `mt-10` → `mt-8`.

4. **Recent ads grid columns** (lines 797, 843)
   - At `max-w-5xl` (~1024px), `xl:grid-cols-4` still works; leaving columns unchanged. Cards will simply line up under the composer.

No content / behavior changes. Sideways video thumbnails in the screenshot come from the source video metadata, not from layout — out of scope here.