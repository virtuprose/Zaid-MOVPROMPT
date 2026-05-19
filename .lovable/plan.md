## Problem

Storyboard panels are generated in parallel — each call sends only the original anchor image to `gemini-3.1-flash-image-preview`. With independent runs, the model drifts on face/wardrobe/proportions between panels, so the character looks like a different person from shot to shot. The IDENTITY_LOCK text alone is not enough; visual reference chaining is what keeps nano-banana-style models on-model.

## Fix: sequential chain in `supabase/functions/generate-reference-image/index.ts`

When `mode === "storyboard_panels"` and `prompts.length > 1`, replace the current `Promise.allSettled(prompts.map(...))` with a sequential loop:

```text
panel 1 → refs = [anchor]
panel 2 → refs = [anchor, panel 1]
panel 3 → refs = [anchor, panel 2]
panel N → refs = [anchor, panel N-1]
```

Details:
- Keep `anchor` = the first user-supplied reference URL (character sheet or key frame). Other user refs (≤3 more) are appended after it, leaving room for the prior-panel image.
- After each successful generation, upload + sign as today, then push the **signed URL** into the next iteration's `referenceUrls` as the "previous panel" anchor.
- Cap total refs at 4 (gateway limit) — anchor + previous panel + up to 2 user-supplied extras.
- On failure of one panel: continue with the chain using the last successful panel (or fall back to anchor only). Refund credits for the missing panels exactly like today.
- Regenerate-single-panel path (`shot_index` set, `prompts.length === 1`) stays as-is — no chain needed.
- `character_sheet` and `single_panel` modes: unchanged (still parallel / single).

## Prompt strengthening (small)

In the storyboard branch (lines 166-181), when chaining is active append a short continuity clause to every prompt: `"Same character, wardrobe, hair, face, and props as the attached previous panel — only the action and framing change."` This pairs with the new visual anchor.

## Trade-offs to flag to the user

- Generation goes from parallel to sequential → ~N× slower (≈8-9× for a full 9-panel storyboard). A 9-panel render that takes ~15s today will take ~60–90s. Still well within the 150s edge timeout, but the user will feel it.
- If we want to keep some parallelism we can chain in **pairs** (panels 1+2 parallel from anchor, then 3+4 use panel 2, etc.) — happy to do that instead if speed matters more than maximum continuity.

## Out of scope

- Changing the image model.
- Adding a second pass / face-restore step.
- Client-side changes — the existing `GeneratedImageCard` and agent prompt already do the right thing once the edge function chains.