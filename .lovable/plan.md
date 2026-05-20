## What's wrong today

Two issues showing up in the screenshot + the recent thread:

1. **The Director batches 4 unrelated questions in one card** (action, duration, audio, aspect ratio). It reads like a form, not a conversation. The user wants one decision per turn.
2. **No anchored entry path when a character is uploaded.** On turn 1, the Director asks the generic "key frame first or go straight to video?" fork — even when a character photo is attached. It should instead lock the character first (sheet), then move to the key frame, then to the video. Step by step.
3. **The key-frame step has no choice of authorship.** Right now the user either types a scene or skips. The user wants an explicit two-way fork: *describe the scene yourself* OR *let the Director write it*.

## Target flow (when a character image is attached on turn 1)

```
Turn 1  user uploads character photo + brief
Turn 2  Director: "Locking your character first. Generating the sheet…"
        → generate_reference_image mode:"character_sheet" (auto, no question)
Turn 3  sheet returns → Director: "Sheet locked. Ready for the opening key frame.
        Want to describe the scene yourself, or should I write it?"
        → 2-choice card: [Describe it myself] [Let the Director write it]
Turn 4a if "describe": single freeform input → aspect ratio → key frame renders
Turn 4b if "let Director": Director proposes a scene in directors_note →
        aspect ratio → key frame renders
Turn 5  key frame returns → ONE question at a time:
        1. action in the shot
        2. duration
        3. audio
        4. aspect ratio (only if not already locked from key frame)
        each as its own ask_clarification turn, never bundled.
Turn 6  ask_model_choice → generate_prompt → request_video_generation
```

When NO character is uploaded, the existing first-turn fork stays, but the *post-key-frame* questions are still asked **one at a time**, not as a 4-question batch.

## Changes

### 1. `supabase/functions/director-agent/index.ts` — system prompt

- **Replace the FIRST-TURN PATH CHOICE section** with an anchored decision tree:
  - If the user's first turn includes a **character/person image** (role: image, face visible) → skip the fork, immediately call `generate_reference_image` mode `character_sheet` with the uploaded image in `reference_urls`. Announce the step in `directors_note`: "Step 1 of 3 — locking your character."
  - If the first turn includes a **product/object image** → same, but `subject_kind: "product"` and announce "Step 1 of 3 — locking your product."
  - If the first turn has no reference image → keep the existing fork ("key frame first / go straight to video / upload a reference").
- **Add a POST-SHEET STEP**: after the character/product sheet returns, the next assistant turn MUST be `ask_clarification` with **exactly one** question — *"Want to describe the opening scene yourself, or should I write it?"* — and `suggestions[0].chips = ["Describe it myself", "Let the Director write it"]`. Set `reason: "Step 2 of 3 — pick the opening key frame."`
  - If user picks "Let the Director write it": the next turn calls `generate_reference_image` mode `single_panel` with a Director-authored scene in `prompt` (echoing the locked spec + sheet identity). No extra question.
  - If user picks "Describe it myself": next turn is `ask_clarification` with one freeform question "Describe the opening scene." (no chips). Then render.
- **Add ONE-QUESTION-AT-A-TIME hard rule** (new section, replaces the implicit "up to 4 questions"):
  - `ask_clarification` MUST send **exactly one** question per turn for all step-by-step phases (post-sheet scene fork, post-key-frame routing axes, aspect ratio, audio, duration). Never bundle.
  - The only exception is the existing **ASK_CLARIFICATION COHERENCE** media-drop ask (which already stays alone).
  - Order for post-key-frame routing axes: action → duration → audio → aspect ratio (skip aspect if a key frame is attached, since the client inherits its ratio).
- **Add a "STEP X of N" prefix convention** to `reason` so the user always knows where they are (e.g. "Step 2 of 3 — opening key frame.").

### 2. `src/components/director/DirectorChat.tsx` — small client wiring

- When the Director sends `ask_clarification` with chips `["Describe it myself", "Let the Director write it"]`, render the existing `QuestionCard` (no new component needed — the chips render as tappable options and the freeform input is still there as fallback). No layout work.
- Update the post-sheet handler (`handleSubjectLockChoice` / sheet completion path around line 645–680) to **stop auto-surfacing the aspect-ratio chip** after a sheet renders. Instead, wait for the Director to send the new "describe yourself / let me write it" question. The aspect chip surfaces only after the scene step resolves.
- No changes to `Composer`, `QuestionCard`, `SubjectLockChoiceCard`, or sheet generation code.

### 3. No changes needed to

- `generate-reference-image` edge function (identity lock already fixed in the previous turn).
- `SubjectLockChoiceCard` (still used when no image is uploaded and the Director asks the subject-lock question manually).
- Aspect/model/video cards.

## Verification

1. Upload a character photo + short brief → Director should immediately render the sheet (no questions). Toast/directors_note says "Step 1 of 3 — locking your character".
2. After the sheet renders, the next bubble is a single-question card: *"Describe the opening scene yourself, or want me to write it?"* with two chips.
3. Tap "Let the Director write it" → key frame renders without any extra input.
4. After the key frame, questions arrive **one card at a time** (action → duration → audio), each its own bubble.
5. Upload no image, plain text brief → existing "key frame first / go straight to video" fork still appears (regression check).
6. The 4-question screenshot the user shared should never appear again.