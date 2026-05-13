## Goal

Polish the model picker dropdown: remove the leftover Radix chevrons, classify variant pills by tier, add a Sort-by row, and confirm the open/closed state coordination.

## Changes

### 1. Remove chevron scroll buttons (item 1)
The 40px gradient fade already exists. The chevrons the user still sees come from shadcn's `SelectContent`, which renders `<SelectScrollUpButton />` and `<SelectScrollDownButton />`. Hide them inside the model picker only via a scoped CSS rule on the existing `.model-picker-content` class:

```css
.model-picker-content [data-radix-select-scroll-up-button],
.model-picker-content [data-radix-select-scroll-down-button] {
  display: none;
}
```

Add this rule to `src/index.css`. The fade stays as the only scroll affordance.

### 2. Sticky selected-model card (item 2)
The only persistent "selected model" surface is the `variantDesc` paragraph below the trigger. It is already conditional on `!open`. Verify and keep that gate so it's hidden while the dropdown is open. No code change unless I also find another sticky element during implementation.

### 3. Variant pill tiers (item 3)
Replace the single amber-outline pill with a tier-aware pill. Build a per-model classification map in `ModelPicker.tsx`:

| Tier | Style | Models |
|---|---|---|
| LITE | gray outline (`#71717A` border, gray text) | Veo 3.1 Lite |
| FAST | amber outline (current) | Veo 3.1 Fast, Veo 3 Fast, Seedance 2.0 Fast, Seedance Pro Fast, Kling 3 Fast (if any) |
| FLAGSHIP / PRO | amber filled (amber bg, black text) | Kling 3.0 Omni / Omni Edit, Seedance Pro, Seedance 1.5 Pro, Veo 3.1 (base flagship) |
| TURBO | red outline (`#EF4444`) | Kling 2.5 Turbo |

Other variants (Motion Control, Video Edit, Omni without "Pro" branding) keep the current amber-outline default. Pill label = uppercase variant token (already computed by `splitLabel`). Tier is decided by `(value, variantToken)` lookup so it's deterministic and easy to extend.

### 4. Hover state (item 4)
Already implemented (`hover:bg-[#161618]` + `hover:border-l-primary`). Add `transition-[background-color,border-color] duration-150 ease-out` to the row so the change is explicitly smooth. Cursor is already `cursor-pointer`.

### 5. Sort-by pills (item 5)
Add a row directly below the "Available providers" line inside the sticky header:

- Label "Sort by:" — 12px, `text-muted-foreground`
- Four pills: `Recommended` (default) · `Quality` · `Speed` · `Price`
- Active: `bg-primary/15 text-primary border border-primary/40`
- Inactive: `bg-transparent text-muted-foreground hover:text-foreground border border-transparent`
- Stored in a local `sort` state inside `ModelPicker`.

Sort logic:
- **Recommended** — current behavior (group order Veo → Kling → Seedance, original order inside each group; "Any Model" pinned on top).
- **Quality / Speed / Price** — flatten all models into a single list (drop the per-provider section headers in these modes for clarity), sort by a numeric rank, keep "Any Model" pinned on top. Provider name shown as a small subtitle on each row so context isn't lost.

Add a small metadata table next to the existing `MODEL_GROUPS` (in `src/lib/models.ts` or co-located in `ModelPicker.tsx` to avoid bloating shared lib): `{ value: string, qualityRank: number, speedRank: number, priceRank: number }`. Lower rank = better in that dimension. Defaults applied if a model is missing from the table.

## Files to change

- `src/components/ModelPicker.tsx` — tier-aware pill component, Sort-by pill row, sort logic, smooth hover transition.
- `src/index.css` — hide Radix chevrons inside `.model-picker-content`.
- `src/lib/models.ts` (or local const in ModelPicker) — per-model `qualityRank` / `speedRank` / `priceRank`.

## Out of scope

- No new translation keys for now (Sort-by labels stay in English here; I'll wire i18n in a later pass if you want).
- Mobile/tablet behavior is unchanged beyond the hover / pill restyle.
