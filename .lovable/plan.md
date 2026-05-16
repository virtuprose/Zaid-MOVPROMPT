## Goal

Reorganize the composer on `/marketing` to match the reference: a left **vertical sidebar** with **Product / App** mode buttons, the existing composer in the middle, and **preview thumbnails** (selected brand + selected character) sitting just to the left of the **Generate** button.

## Layout

```
┌──────┐  ┌────────────────────────────────────────────────────────────────┐
│ ▣    │  │  [+]  👤 Stefan   🟨 Haribo can…                               │
│Product│  │                                                                │
│      │  │  Describe what happens in the ad…                              │
│ ⊘    │  │                                                                │
│ App  │  │  [UGC ▾] [Hook ▾] [Setting ▾] [⚙]    [🟨][👤] [GENERATE ✨ 90] │
└──────┘  └────────────────────────────────────────────────────────────────┘
```

## Changes — all in `src/pages/MarketingStudio.tsx`

### 1. Left sidebar (Product / App)

- Wrap the existing composer in a horizontal flex: `<div class="flex gap-3">` with a **72px-wide sticky sidebar** to its left.
- Sidebar contains two stacked rounded-2xl buttons (~64×64):
  - **Product** — `Package` icon + label
  - **App** — `AppWindow` icon + label
- Active state: amber-tinted border + faint fill (`border-[#F5A524]/50 bg-[#F5A524]/10`). Inactive: `border-border/60 bg-secondary/40 text-muted-foreground`.
- Behavior: clicking sets a new local `subjectOverride` state (`"product" | "app"`). The existing `subject` constant becomes `subjectOverride ?? brandKit?.subject ?? "product"` so it flows into the prompt + brand sheet defaults without touching backend code.
- Default selection: `brandKit?.subject ?? "product"`, kept in sync via `useEffect` when the active brand changes.

### 2. Preview thumbnails next to Generate

Inside the bottom chip row, just before the existing `<Button>`, render small preview tiles when each is set:

- **Brand tile** — 56×56 `rounded-2xl` with `brandKit.logo_url` (object-contain), label "PRODUCT" / "APP" overlay at the bottom in tiny uppercase. Hidden if no brand active.
- **Character tile** — 56×56 `rounded-2xl` with `characterKit.reference_url` (object-cover), label "AVATAR" overlay at the bottom. Hidden if no character active.
- Clicking each tile opens its corresponding picker popover (reuses existing `BrandPickerPopover` / `CharacterPickerPopover` as the wrapper).

These are read-only previews — the existing pills above remain the primary picker/detach UI.

### 3. Container width

Bump the page container from `max-w-6xl` to `max-w-7xl` so the sidebar + composer + previews + Generate fit comfortably at ≥1240px. On mobile (`< sm`), sidebar collapses to a horizontal row above the composer (`flex-col sm:flex-row`).

## Out of scope

- "GENERATE ✨ 90" credit cost badge in the screenshot — no credit cost system exists yet, skip.
- Subject does not become its own DB field — we only override the in-memory `subject` used for prompt composition.
- No changes to `BrandKitSheet` / `CharacterKitSheet` / brand schema.
