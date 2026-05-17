## Goal

Replace the existing ad composer block in `src/pages/MarketingStudio.tsx` with a single self-contained `AdBuilderPanel` component that matches the supplied spec exactly. Surrounding page (TopNav, headline, gallery, dialogs) stays untouched.

## New file: `src/components/marketing/AdBuilderPanel.tsx`

Self-contained, exportable, typed. Uses Tailwind arbitrary values for the exact hex colors and pixel sizes. `lucide-react` icons only: `Package`, `Plus`, `X`, `Sparkles`, `Globe`, `SlidersHorizontal`, `Wand2`, `ChevronDown`.

Structure:

```text
<header copy>                       ← 13px, rgba(255,255,255,0.45), centered, mb 20px
<container>                         ← #0F0F10, 1px rgba(255,255,255,0.06), r16, p20, max-w 900, mx-auto
  <row 1: product>                  ← flex, gap 12, items-stretch
    <product tile 72x72>            ← Package icon + "Product" label
    <chips wrap, gap 8>
      <chip "Bose"> <chip "Maya">
      <add button 28x28 dashed>
  <divider 1px rgba(255,255,255,0.05)>
  <row 2: controls>                 ← flex row, items-center, gap 10
    <Format dropdown button>
    <Location dropdown button>
    <Advanced 36x36 icon button>
    <spacer flex-1>
    <Generate ad button>            ← #EF9F27 bg, #412402 text, Wand2 icon, flat
```

Component API:

```ts
type Chip = { id: string; label: string; avatar?: string };
interface AdBuilderPanelProps {
  chips: Chip[];
  onAddChip: () => void;
  onRemoveChip: (id: string) => void;
  onPickFormat: () => void;
  onPickLocation: () => void;
  onOpenAdvanced: () => void;
  onGenerate: () => void;
  formatLabel?: string;     // defaults to "Format"
  locationLabel?: string;   // defaults to "Location"
  generateDisabled?: boolean;
  generateLabel?: string;   // defaults to "Generate ad"
}
```

Seeds (`Bose`, `Maya`) live in the parent — panel just renders the `chips` it receives. Avatar circle shows uppercase initial when no `avatar` URL.

All interactive elements get the spec'd hover states via Tailwind (`hover:border-white/15`, `hover:bg-[#F0A93A]`, `active:scale-[0.98]`, etc.). No gradients, glows, shadows, or noise.

## Wire-up in `src/pages/MarketingStudio.tsx`

1. Remove the existing `Pick a format and a location...` paragraph (lines ~550-552) and the entire composer block (the sidebar + composer card, ~555-733). Keep the `<h1>` headline and the gallery below intact.
2. Mount `<AdBuilderPanel />` in their place, fed from existing state:
   - `chips` derived from `brandKit` (label = brand name, avatar = `logo_url`) and `characterKit` (label = character name, avatar = `reference_url`), each with a stable `id` (`"brand"` / `"character"`). When neither is set, seed with placeholder `Bose` and `Maya` so first paint matches the spec — replaced as soon as the user picks real ones.
   - `onRemoveChip` → calls existing `setBrandActive(null)` / `setCharacterActive(null)`.
   - `onAddChip` → opens existing `BrandKitSheet` (or a small menu if both kits empty — simplest: open brand picker).
   - `onPickFormat` → `setOpenPicker("format")`.
   - `onPickLocation` → `setOpenPicker("location")`.
   - `onOpenAdvanced` → opens existing `RenderSettingsPopover` via a ref/state flag (or wraps the Advanced button in the existing popover trigger).
   - `onGenerate` → existing `startGenerate`.
   - `formatLabel` / `locationLabel` resolved from existing `format`/`setting`/custom values; fall back to defaults.
   - `generateDisabled` = `!hasInputs || submitting || drafting`.
3. Keep all dialogs (`PresetPickerDialog`, `BrandKitSheet`, `CharacterKitSheet`, `ConfirmRightsDialog`, lightbox, etc.) and the gallery untouched.

## Out of scope

- No backend, schema, types, route, or business-logic changes.
- No changes to gallery, lightbox, dialogs, or surrounding sections.
- No new dependencies.

## Verification

- Visual check at /marketing: container centered, 900px max, two rows with the spec'd divider, chips render with initial avatars, Generate button is flat amber `#EF9F27` with dark amber text.
- Removing a chip clears the corresponding kit; clicking Format/Location opens the existing pickers; Generate triggers existing flow.
