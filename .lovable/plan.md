## Free Director chat replies — charge credits only on real generations

Stop deducting credits for plain text/multimodal replies from the Director agent. Continue charging only when the user actually generates an image (`generate-reference-image`) or a video (`generate-video`).

### Backend — `supabase/functions/director-agent/index.ts`
- Remove the `chargeCredits({ reason: "director_chat_text" | "director_chat_multimodal" })` block at lines 820–833 (incl. the surrounding try/catch and `InsufficientCreditsError` branch). The tool-call branches into `generate-reference-image` / `generate-video` already charge inside those functions, so generation costs remain intact.

### Frontend — `src/components/director/Composer.tsx`
- In the cost/tooltip block (lines 568–584), hide the `CostChip` for the Director composer and change the send-button tooltip to just `"⌘/Ctrl + Enter to send"`. No "Costs N credits" copy for a chat reply.
- Leave the storyboard/key-frame/video generation cost chips alone — those actions remain billed.

### Out of scope
- `generate-reference-image` charging (image generations stay billed).
- `generate-video` charging (video generations stay billed).
- Pricing config / RPC functions / ledger schema.
- The `VideoOptionsDialog` cost chip.
