
## Plan — Add Kling 2.6 Turbo and remove Higgsfield

### Changes

**1. `src/lib/models.ts`**
- In the **Kuaishou (Kling)** group, add a new entry: `{ value: "kling-2.6-turbo", label: "Kling 2.6 Turbo" }` (placed right after `kling-2.6` so the family stays grouped).
- Remove the entire **Higgsfield** group (3 entries: `higgsfield-lite`, `higgsfield-standard`, `higgsfield-turbo`).

**2. `src/lib/modelContracts.ts`** (verification only)
- The Kling matcher uses `model.startsWith("kling")`, so `kling-2.6-turbo` automatically picks up the standard Kling contract — no change needed.
- Higgsfield had no special branch — falls through to default — no change needed.

**3. `supabase/functions/generate-prompt/experts/kling.ts`** (small addition)
- In `getKlingVariantHints`, add a Turbo branch alongside the existing 2.6 legacy note so the agent knows Turbo is faster/lighter:
  - "Kling 2.6 Turbo — speed-optimized variant of 2.6. Keep mainPrompt tight (80–140 words), single subject + single primary action. modelNotes MUST mention: 'Kling 2.6 Turbo — fastest 2.6 variant, optimized for quick iteration; expect slightly less motion fidelity than standard 2.6.'"

### Files touched
- `src/lib/models.ts`
- `supabase/functions/generate-prompt/experts/kling.ts`

No translations, schema, or DB changes. Frontend + edge function — requires **Publish → Update** to reach live users.
