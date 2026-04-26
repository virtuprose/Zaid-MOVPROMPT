## Goal
Align `generate-prompt` with `enhance-description` so enhanced descriptions (up to 4000 chars) are accepted.

## Change
**File:** `supabase/functions/generate-prompt/index.ts`

- Update the description validation check (currently rejects > 2000 chars) to allow up to **4000 chars**.
- Update the corresponding error message string from "under 2000 characters" → "under 4000 characters".

No client changes needed — the UI counter in `ConfigPanel` is informational and will continue to work. `enhance-description` stays at its current 4000 cap.

## After
Redeploy the `generate-prompt` edge function so the new limit takes effect.