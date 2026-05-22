# Make ads actually look like *your* product

## The problem
Right now the AI knows the product only as a short name + ~120-char description + tagline. So when it writes the scene and renders the video, it has no idea a burger has a bun + patty + lettuce, a sneaker has laces + a swoosh, a serum has a dropper, etc. The format ("UGC", "Hero shot") and setting ("Kitchen") are locked, but the *product itself* drifts — that's why the result feels disconnected.

## The fix — three connected upgrades

### 1. Deeper product analysis when you upload the image
`analyze-brand-image` will return a real **product fact sheet**, not just a name + tagline:
- **Category** (e.g. "smash burger", "running sneaker", "vitamin C serum")
- **Key visual parts** (e.g. "toasted brioche bun, double beef patty, melted cheddar, pickles, sesame seeds")
- **Materials / finish** (glass dropper, matte plastic, brushed metal…)
- **Hero colors** (3–5 dominant colors)
- **Packaging / form factor** (bottle, box, can, app screen…)
- **Logo placement** on the product, if visible
- Keeps the existing name / description / tagline

These get saved on the product (new columns: `category`, `visual_parts`, `materials`, `hero_colors`, `packaging`). All filled by AI when you upload — you can edit them in the product sheet.

### 2. Scene draft uses the fact sheet
`write-ad-scene` will receive the full fact sheet and is instructed to:
- Name the product explicitly and **describe its visible parts in the hero frame** ("hands lift the smash burger, cheese pulling, sesame bun glinting").
- Place those parts inside the chosen Format + Setting beat — not generic "product hero".
- Respect your describe-box note as the adaptation layer (unchanged behavior).

### 3. Final video prompt locks the product
`composeStudioPrompt` will inject a **PRODUCT LOCK** block right after the subject line, e.g.:
> Product lock — Acme Smash Burger: toasted sesame brioche bun, double beef patty, melted cheddar, butter-grilled, served on parchment. Hero colors: golden, deep red, cream. Match these details in every frame; do not invent other ingredients.
This goes to Seedance alongside the existing `@ImageN` reference lock, so even when the AI has creative room it stays anchored to the real product.

## Product-sheet UI
The Edit Product dialog gets a small read-only "AI saw" section (chips for category, parts, materials, colors) under the image, with a "Re-analyze" button. Power users can expand it and edit any chip.

## Technical bits (skip if non-technical)
- DB migration: add columns to `brand_kits` (`category text`, `visual_parts text`, `materials text`, `hero_colors jsonb`, `packaging text`), all nullable.
- `analyze-brand-image` edge function: extend the tool-call schema to return the new fields; keep token output bounded; same model.
- `BrandKit` type + `useBrandKit` save/select extended for the new fields.
- `BrandKitSheet`: render an "AI saw" panel with chips + Re-analyze button.
- `writeAdScene` payload + `write-ad-scene` system prompt: include the fact sheet, instruct the model to describe visible parts in the hero frame.
- `composeStudioPrompt`: add Product Lock block per brand.
- No changes to FORMATS / SETTINGS catalogs, no changes to how presets are picked.

## What you'll feel
Upload a burger photo → product sheet auto-fills "smash burger, sesame brioche bun, double patty, cheddar, pickles, golden/red/cream". Pick **Speed Reveal + Kitchen** → describe box drafts a scene that opens on the bun glinting and ends on the cheese pull. Render → the video is unmistakably *your* burger, not a generic one.
