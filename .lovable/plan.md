

## Plan — Redesign preset library: visual previews + cleaner browsing

### The problem
Today the "Describe Your Vision" panel hides ~118 presets behind 5 stacked accordions. When opened, each accordion dumps a wall of identical text-only pills. Users can't tell what "Dolly Zoom", "Crash Zoom In", or "Bullet Time" actually looks like — they just see words. The list also feels heavy and visually monotone.

### The solution — three combined moves

**1. Replace accordions with a tabbed picker + search.**
One row of 5 category tabs (Basic Camera, Epic Camera, Effects, Catch the Pulse, Mix) sits at the top. Below it, a search box (`Search 118 presets…`) filters the visible grid in real time across all categories. No more accordion stacking; the panel always shows one clean grid at a time.

**2. Show each preset as a visual preview card, not a text chip.**
Each preset becomes a small card (~110×80) with:
- A short looping video/GIF showing the effect (placed on the project's CDN)
- The preset name overlaid at the bottom
- Hover → cyan ring + slight scale-up + plays the loop
- Click → appends to the description (existing behavior preserved)

The grid is responsive: 4 columns on desktop, 3 on tablet, 2 on mobile. Selected presets get a cyan border + checkmark badge so users can see what they've already added.

**3. Hover preview tooltip with bigger demo + plain-language description.**
On hover (desktop) or long-press (mobile), a Radix Tooltip pops a 320px preview with:
- Larger demo clip
- Plain-language description ("The camera tilts down past the subject as it rises in the frame — classic Hitchcock vertigo effect.")
- Best-for hint ("Great for: Reveals, dramatic entrances")

### Where the preview media comes from

We have two options. I recommend **B** because it ships immediately with zero cost and looks clean, then we can upgrade individual presets to real clips over time.

| Option | What it is | Pros | Cons |
|---|---|---|---|
| A. Real video clips | Tiny 1-2s MP4/WebM loops per preset, hosted on Supabase Storage | Most informative | Need to source/generate ~118 clips; storage + bandwidth cost; heavy first-load |
| **B. Animated SVG/Lottie + emoji** *(recommended start)* | Each preset gets a small animated icon (e.g. arrow swooping for Dolly In, ripple for Levitation, lens flare burst for Bloom) built from existing Lucide icons + CSS keyframes | Zero asset cost, instant load, on-brand with the dark cinematic theme, easy to ship today | Less literal than real footage |
| C. AI-generated thumbnails | Pre-render one still per preset via gemini-3-flash-image-preview, cache in Storage | Visual without video weight | Up-front generation cost, one-time setup task |

We start with B and add a "Preview" button on the hover card that, when clicked, triggers an on-demand video generation via the existing `generate-prompt` infrastructure (future enhancement, not in this change).

### Files touched

- **`src/components/ConfigPanel.tsx`** — full rewrite of the preset section. Replace `Accordion` with `Tabs` + `Input` (search) + responsive grid of new `<PresetCard>` components. Keep the description textarea + collapsible wrapper as-is.
- **`src/components/PresetCard.tsx`** *(new)* — single card: animated icon area (top), label (bottom), selected state, click handler. Wrapped in a Radix `Tooltip` that renders the larger hover preview.
- **`src/lib/presets.ts`** *(new)* — extract the `PRESET_GROUPS` array into its own module, and add per-preset metadata: `{ id, label, group, icon, animationClass, description, bestFor }`. This keeps `ConfigPanel.tsx` lean and lets translations key off `id`.
- **`src/index.css`** — add a small set of keyframe animations used by preset icons (`@keyframes preset-zoom-in`, `preset-orbit`, `preset-shake`, `preset-pulse`, `preset-drift`, etc. — ~10 reusable animations cover the whole catalog).
- **`src/i18n/translations/en.ts`** + **`ar.ts`** — add `presets.search.placeholder`, `presets.empty`, `presets.tab.<id>` keys. Per-preset names stay English for now (cinematography terms are universal); add Arabic translations in a follow-up if needed.

### Behavior preserved
- Clicking a preset still appends `, <preset>` to the description textarea.
- The whole section still lives inside the existing collapsible "Describe Your Vision".
- No changes to the backend or to which presets exist.

### Verification
- Open Describe Your Vision → see tabs + search + grid of animated preset cards.
- Type in search → grid filters live across all categories (no need to switch tabs).
- Hover any card → cyan ring, animation plays, tooltip with bigger preview + description appears.
- Click a card → checkmark appears on the card + word is appended to the textarea; click again removes it.
- Mobile (≤640px): grid drops to 2 columns, tooltip becomes a tap-to-open popover.
- RTL: tabs and grid flip naturally; tooltip flips to the left side.

