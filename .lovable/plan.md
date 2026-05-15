# Ads Studio — Brand kit & Location inputs

Add two new structured inputs to the composer, sitting next to Format / Hook / Setting as dropdown chips. They feed into the prompt builder so the AI knows **what** is being advertised and **where in the world** the ad lives.

## 1. New chips in the composer

Order, left → right:

```
[Brand ▾]  [Location ▾]  |  [Format ▾]  [Hook ▾]  [Setting ▾]
```

A subtle vertical divider separates "what/where" (brand + location) from the existing creative chips. Same `PresetChip` styling — red-tinted border when filled, chevron, label flips to the chosen value.

## 2. Brand chip — full brand kit

Opens a side sheet (reuse Sheet component) titled **"Your brand"** with:

- **Logo / product image / app icon** — drag-and-drop upload (1 image, ≤5MB). Stored in the existing `director-uploads` private bucket under `marketing/{user_id}/brand/`. Preview thumb shown after upload. Used as visual reference by the AI.
- **Name** — text, required (e.g. "Acme Sneakers", "Lumen App")
- **One-line description** — text, 120 char max ("AI-powered sleep tracker for athletes")
- **Website / App Store URL** — optional
- **Tagline** — optional, 60 char max
- **Target audience** — optional, free text ("Gen-Z runners in major US cities")
- Subject toggle (Product / App) lives at the top of this sheet — the standalone segmented control above the composer is removed, since it's now part of the brand kit.

Saving collapses the sheet and the chip label becomes the brand name with a 16px logo thumb prefix. A small "Edit brand" affordance reopens the sheet. Brand kit is persisted per user (new `brand_kits` table, one row per user, RLS = own row only) so it auto-loads next visit.

## 3. Location chip — geography (separate from Setting)

Clarified semantics:
- **Setting** = scene type (kitchen, rooftop, studio) — unchanged
- **Location** = real-world place for cultural & visual styling

Opens a small popover with two tabs:

- **Place** — free-text input + preset grid: Tokyo, NYC, Paris, Dubai, LA, London, Lagos, São Paulo, Seoul, Mexico City, Mumbai, Berlin. Selecting a preset fills the text field; user can also type anything ("Kyoto backstreet", "Marrakech medina").
- **Reference image** — upload a photo of the actual location (storefront, neighborhood, room). Stored in `director-uploads` under `marketing/{user_id}/location/`. AI uses it as visual ground truth.

Either or both tabs can be used. Chip label shows the place name (or "Custom location" if only an image is set), with a 16px image thumb prefix when an image is attached.

## 4. Prompt assembly

Extend the prompt builder so the final prompt to Lovable AI includes:

- Brand: name, description, tagline, audience, URL (text context) + logo/product image (vision input)
- Location: place name (text) + location image (vision input, when present)

Existing Format / Hook / Setting logic is unchanged.

## 5. Generate-button readiness

"Add inputs to generate" stays the disabled label. Becomes enabled when **either**:
- the existing free-text brief is filled, **or**
- a brand kit is set + at least one of Format/Hook/Setting is chosen

This way the new chips are a real path to generating, not just decoration.

---

## Technical notes

**Files**
- `src/pages/MarketingStudio.tsx` — add two chips, remove standalone subject segment, wire to prompt builder
- `src/components/marketing/BrandKitSheet.tsx` — new
- `src/components/marketing/LocationPopover.tsx` — new
- `src/lib/marketing/brandKit.ts` — load/save brand kit hook
- Prompt builder (wherever `doGenerate` composes the request) — accept `brand` and `location` payloads

**Backend (migration)**
- New table `public.brand_kits` (user_id PK fk → auth.users, subject enum, name, description, url, tagline, audience, logo_path, updated_at) with RLS: select/insert/update/delete where `user_id = auth.uid()`.
- Reuse `director-uploads` bucket; add a path-scoped policy so users can only read/write `marketing/{auth.uid()}/...`.

**No business-logic changes** beyond the prompt builder accepting two new optional context blocks. Format/Hook/Setting presets, generation flow, and existing UI elsewhere are untouched.
