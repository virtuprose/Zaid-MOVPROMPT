## Why

A scan of every `chargeCredits` / `priceFor` / `videoCost` call vs the `credit_prices` table found three problems:

1. **Missing rows** — these reasons are charged in production but have NO row in `credit_prices`, so they silently fall back to hardcoded defaults in the edge functions:
   - `storyboard_plan` (fallback **1**) — `plan-storyboard`
   - `image_upscale_4k` (fallback **3**) — `generate-reference-image` (both edit + generate paths)
   - `image_edit` (no fallback registered — charged via `priceFor("image_generation", 5)` reuse)
   - `video.seedance-2.0-ref` (fallback **15/s**) — `story-render` charges 4 acts × duration with this key
2. **Stale per-action prices** — `director_chat_multimodal` (3) is the same tier as a full image_generation step minus 2; multimodal Director turns now drive Gemini 3 Pro vision and cost more.
3. **Video catalog drift** — several new model ids exist in `videoModelCatalog.ts` and the model picker but have no `video.<id>` row, so they fall back to the generic 15/s default (under-charging for premium tiers, over-charging for lite tiers).

## What changes

### A. Add missing rows to `credit_prices`

| key | kind | amount | notes |
|---|---|---|---|
| `storyboard_plan` | flat | 2 | planner uses Gemini vision; was effectively 1 |
| `image_upscale_4k` | flat | 4 | FAL clarity-upscaler call after generation/edit |
| `image_edit` | flat | 6 | nano-banana edit + mask compositing; was reusing `image_generation` (5) |
| `video.seedance-2.0-ref` | per_second | 18 | matches Seedance 2.0 reference-to-video provider cost; was falling back to 15 |

### B. Reprice existing rows

| key | from → to | reason |
|---|---|---|
| `director_chat_text` | 1 → 1 | unchanged |
| `director_chat_multimodal` | 3 → 4 | Gemini 3 Pro vision |
| `image_generation` | 5 → 5 | unchanged |
| `write_ad_scene` | 2 → 2 | unchanged |
| `story_stitch` | 10 → 8 | ffmpeg-only, no model inference; was overpriced |

### C. Realign video rates against the catalog tiers in `videoModelCatalog.ts`

Only the rows where catalog tier and current price disagree are touched. Examples:

- `video.veo-3.1` 45 → 42, `video.veo-3.1-fast` 20 → 18, `video.veo-3.1-lite` 10 → 8
- `video.kling-v3-4k` 60 → 55, `video.kling-omni*` 50 → 45
- `video.seedance-v1-pro-ref` 15 → 16 (ref variants are slightly more expensive on FAL)
- `video.hailuo-02-standard` 8 → 7

Full final values delivered as one SQL upsert.

### D. No code changes required

All charging paths already read from `credit_prices` via `priceFor` / `videoCost`. The pricing UI (`src/lib/credits/pricing.ts` + `AccountBilling`) re-reads the catalog on mount, so the price-list page updates automatically. The frontend `videoModels.ts` shows credit/s from the same table.

### E. Out of scope

- No refunds or retroactive adjustments for past charges.
- No change to the daily grant (+10/day, cap 30) or signup bonus (50).
- No change to the `charge_credits` / `refund_credits` RPCs.

## Technical details

Single migration that runs one `INSERT ... ON CONFLICT (key) DO UPDATE SET kind = EXCLUDED.kind, amount = EXCLUDED.amount` against `public.credit_prices` for every row in sections A–C. Server cache TTL in `_shared/credits.ts` is 60s, so new prices take effect within a minute without a redeploy.

After the migration I'll spot-check `credit_prices` with `supabase--read_query` to confirm all keys exist and amounts match the table above.
