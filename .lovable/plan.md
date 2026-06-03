# Sheet naming + one-button render path

Two fixes from the watch-commercial session.

## 1) Sheet label follows the upload (Product vs Character)

**Bug:** You uploaded the Apple Watch and the Director generated a "Character sheet · 3 views". The plumbing for `subject_kind: "character" | "product"` is already in place end-to-end, but two things failed:

- The agent picked `subject_kind: "character"` even though the upload is clearly a product.
- `GeneratedImageCard.tsx` line 339 hardcodes `"Character sheet · 3 views"` instead of using the existing `subjectLabel`.

**Changes:**

- **`supabase/functions/director-agent/index.ts`** — tighten the ANCHORED PATH rule (around line 99) into a hard auto-detection clause:
  - "If the uploaded image is a human, animal-as-character, mascot, or anthropomorphic figure → `subject_kind: 'character'`. Otherwise (watch, phone, shoe, bottle, car, jewelry, food, packaging, any inanimate hero object) → `subject_kind: 'product'`. Never default to 'character' — always look at the image first."
  - Mirror the same rule in `directors_note` wording so the user sees "locking your product" vs "locking your character".
- **`src/components/director/GeneratedImageCard.tsx`** — replace the hardcoded title with `` `${subjectLabel} sheet · 3 views` ``. Same fix for the regen intent text on line 453 ("Regenerate the {subjectLabel.toLowerCase()} sheet …").
- **`src/components/director/CinematicLoader.tsx`** — accept the subject kind so the loading messages say "Designing the product sheet…" / "Locking the product turnaround…" when applicable.

## 2) One Generate button at the end — not three

**Bug:** After locking aspect + audio you see:
1. A "Generate with Seedance" CTA from the chat (chip / suggestion).
2. Click it → prompt card appears → another **"Generate with Seedance"** button at the bottom of the prompt card.
3. Click that → settings dialog opens → another **"Render with Seedance"** button at the bottom of the dialog.

Three buttons for one action. The dialog is also redundant because aspect, audio, and duration were already collected in the chat.

**Changes:**

- **`src/components/director/PromptResultCard.tsx`** — when the resolved settings from chat already cover everything the dialog would ask for (model + duration + aspect + audio all locked in `session.plan.globals` / chat answers), the primary CTA becomes **"Render now"** and goes straight to the approval + render with those values — no dialog. A secondary text link "Adjust render settings" still opens `VideoOptionsDialog` for power users. If any axis is missing, fall back to today's behavior (open dialog).
- **`src/components/director/VideoOptionsDialog.tsx`** — when invoked as "Adjust render settings", rename the confirm button to **"Save & render"** so it reads as "tweak then go", not "this is a different render".
- **`src/components/director/DirectorChat.tsx`** — remove the pre-prompt "Generate with X" `next_suggestions` chip when the agent is about to call `generate_prompt` on the very next turn (i.e. all routing axes are locked). The flow becomes: last routing answer → prompt card appears automatically → single "Render now" button.
- **`supabase/functions/director-agent/index.ts`** — update the post-routing rule so once the last axis is locked, the next turn MUST call `generate_prompt` directly instead of emitting a `Render` chip. The chip is only for cases where the user is still browsing.

## End-state user flow

1. Upload Apple Watch → Director locks "Product sheet · 3 views".
2. Director asks the routing questions one by one (duration → audio → aspect → shot count for Seedance).
3. After the last answer, the prompt card appears with a single **Render now** button.
4. Click → approval modal → render kicks off. Done.

Power users can still click "Adjust render settings" to tweak before render.

## Files touched

- `supabase/functions/director-agent/index.ts`
- `src/components/director/GeneratedImageCard.tsx`
- `src/components/director/CinematicLoader.tsx`
- `src/components/director/PromptResultCard.tsx`
- `src/components/director/VideoOptionsDialog.tsx`
- `src/components/director/DirectorChat.tsx`

No backend schema or migration changes.
