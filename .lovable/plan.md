## Ads Studio — design polish

Scope: visual/presentation only in `src/pages/MarketingStudio.tsx`. No logic, copy, or behavior changes beyond what's listed.

### 1. Hero block
- Reduce title from `text-[40px] sm:text-[52px]` → `text-[32px] sm:text-[44px]`, keep uppercase + tight tracking.
- Subtitle: bump max width `max-w-xl` → `max-w-lg` and tighten leading.
- Section spacing: page wrapper `py-8 sm:py-10` → `py-6 sm:py-8`, hero `mb-8` → `mb-6`.

### 2. Subject sidebar (Product / App)
- Shrink tiles `w-[72px] h-[72px]` → `w-16 h-16`, gap `gap-2` → `gap-1.5`, so they align flush with composer top/bottom edges on desktop.

### 3. Composer card
- Padding `p-4 sm:p-6` → `p-4 sm:p-5`.
- Action row: brand/avatar trigger tiles `w-14 h-14` → `w-12 h-12 rounded-xl` to match chip height (h-9) and Generate button rhythm.
- Generate button: `h-12 px-6 text-base` → `h-11 px-5 text-sm` so it stops dominating the row.
- Chip row gap `gap-2` already fine; ensure `ml-auto` cluster aligns center via `items-center` (already set).
- "Renders as:" footer: `p-3` → `px-3 py-2`, smaller `text-[11px]`.

### 4. Recent Ads section
- Section top margin `mt-14` → `mt-10`.
- `SectionHeader` title `text-2xl sm:text-3xl` → `text-xl sm:text-2xl`, `mb-5` → `mb-4`.
- Grid gap `gap-4` → `gap-3`.
- Cards (UserAdCard, PendingAdCard, CommunityCard): aspect `aspect-[9/12]` → `aspect-[9/16]` only feels right for vertical ads, but they currently render way too tall at 3-cols on desktop. Switch to `aspect-[3/4]` so a 3-up row stays balanced (≈480×640 → ≈480×640 stays similar, but visual weight reduced when combined with 4-col on `xl`).
- Add `xl:grid-cols-4` to the two "Your recent ads" grids so on wide viewports cards shrink instead of stretching; update slice budgets to `Math.max(0, 4 - pendingJobs.length)` (mixed) and `Math.max(0, 8 - pendingJobs.length)` (full).
- PendingAdCard inner: spinner `w-8 h-8` → `w-6 h-6`, label tracking unchanged, subtext `text-[11px]` → `text-[10.5px]` and tone down `from-muted/40` shimmer.

### 5. Misc
- Background blur orb `w-[700px] h-[400px]` → `w-[560px] h-[320px]` so it doesn't push perceived headline higher.
- No changes to TopNav, dialogs, or any non-visible logic.

### Files touched
- `src/pages/MarketingStudio.tsx` (only)

### Out of scope
- Backend/video polling, copy rewrites, new components, mobile-specific overhauls beyond the responsive tweaks above.
