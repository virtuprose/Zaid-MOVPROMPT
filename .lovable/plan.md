## Switch story renders from 8 acts to 4 acts (~1 min total)

### Backend
1. **`supabase/functions/story-render/index.ts`**
   - Replace `act_prompts.length !== 8` validation with `!== 4`.
   - Update error message to "exactly 4 act_prompts".
   - Change `totalCost = perActCost * 8` → `* 4`.
   - Update insert/submit loop comment + metadata `acts: 8` → `acts: 4`.
   - Update `inserted.length !== 8` guard → `!== 4`.

2. **`supabase/functions/director-agent/index.ts`**
   - Rewrite step 5 system prompt: "LAUNCH 4 ACTS" — Act 1 opens, Acts 2–3 escalate, Act 4 resolves. EXACTLY 4 `act_prompts`. Director's note updated to "4 parallel renders".
   - Update `request_story_render` tool schema: `minItems: 4`, `maxItems: 4`, description "Exactly 4 Seedance 2.0 prompts…".
   - Tool description: "Kick off 4 parallel Seedance 2.0 15-second renders" and frontend mention "4-tile strip".

### Frontend
3. **`src/components/director/ActStrip.tsx`**
   - Header label "Story render · 8 acts in parallel" → "Story render · 4 acts in parallel".
   - Grid `grid-cols-4` stays (now a single row of 4).
   - Helper text "unlocks when all 8 finish" → "all 4 finish".

### Stitch (no changes needed)
4. **`supabase/functions/story-stitch/index.ts`** — already iterates over whatever act rows exist; no hard-coded 8. Total length naturally becomes 4 × 15s = 60s.

### Out of scope
- No DB schema changes (act_index is just an integer).
- Translations and other UI labels mentioning "acts" generically remain untouched.
- Pricing per act unchanged; total story cost halves automatically.

Result: a new story render produces 4 Seedance acts in parallel, stitched into a ~1-minute final video.