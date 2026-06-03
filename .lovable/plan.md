## The problem you spotted

You're right — and it's traceable to three rules in the Director's system prompt:

1. **"Step N of M" is hard-coded.** Every flow (Story 5/5, Anchored 3/3, Unanchored 4/4) forces the Director to prefix `reason` with `"Step 2 of 4 — …"`. So every brief, no matter how rich, looks like the same 4-card form.
2. **Free chat is downgraded to "inspiration only".** Line 163 literally says: *"Free-chat brainstorm turns appear tagged `[Free-chat brainstorm — NOT a locked spec]`. Treat them as INSPIRATION ONLY. Numbers, model names, or shot lists mentioned there are NOT user-confirmed answers."* That's why everything gets re-asked.
3. **The opening fork is identical for every UNANCHORED brief.** The first turn is always *"Want me to generate a key frame first, or go straight to the video?"* — even when you already described the scene, mood, character, and intent. So "key frame about what?" is exactly the right complaint.

The result: a smart brief gets the same dumb intake form as an empty one.

## What I'll change

### 1. Read the brief, then recap — never lead with a question
Every first Director turn must start with a one-line **"Heard:"** recap that names the subject, vibe, and any axes the user already implied (duration, aspect, style, audio, model, character/product). Only AFTER the recap can a question follow — and only if something material is still missing.

### 2. Kill the "Step N of M" prefix; use adaptive labels
Replace the rigid counter with what's actually happening at that moment:
- *"Locking the look"* / *"Locking the subject"* / *"Picking the model"* / *"One more routing detail"* / *"Final check"*
- If only one question remains, drop the label entirely.
- Story mode keeps a counter (it's a real fixed pipeline), but single-shot loses it.

### 3. Promote free-chat content to actionable signal
Free-chat turns will still be tagged, but the rule flips: **mine them for already-answered axes** (duration, aspect, audio, style, model, subject kind, mood, action) and add those to a new `[INFERRED FROM FREE CHAT]` block alongside the existing `[LOCKED HANDOFF SPEC]`. The Director must not re-ask anything inferred there unless it's genuinely ambiguous (in which case it asks *"You mentioned X — confirm 9:16 vertical?"*, not a blank chip list).

### 4. Adaptive opening by brief type
Replace the one-size-fits-all *"key frame first or video?"* fork with a brief-type router:
- **Commercial / ad brief** (product, brand, CTA, "spot", "30s ad") → skip the key-frame fork, go straight to model routing + missing axes; if a product image is attached, lock subject sheet first.
- **Cinematic / narrative brief** (scene, story, character action, lighting/lens vocab) → if the scene is well-described, propose a key frame immediately with a 1-line note; only ask if scene is vague.
- **Character-driven brief** (named character, "make him do X") → if image attached, run subject sheet; if no image, ask ONE freeform "Describe the character or drop a reference" and skip the fork.
- **Vague brief** ("make me a video", no specifics) → THEN show the existing fork — that's the one case it actually helps.

### 5. Acknowledge before asking — every clarification
Every `ask_clarification` `reason` field will be required to start with one short clause that quotes/paraphrases what the user already gave, e.g.:
- *"Got the neon ramen bar and slow dolly-in — just need the duration."*
- *"Locked your product. Want the opener cinematic or commercial?"*

This is the structural fix that makes the Director feel like it actually read the brief.

### 6. Skip questions for any axis already covered (enforce harder)
The rule "Do NOT ask a routing question whose answer is already implied" exists but is weakly enforced. I'll add a pre-flight check block: before emitting `ask_clarification`, the Director must list every axis it considers known (from brief + free-chat + handoff) and only ask the highest-priority axis NOT in that list. If all six are covered, jump straight to `ask_model_choice` (or `generate_prompt` if model is named).

## Where the edits land

All changes are to the system prompt inside `supabase/functions/director-agent/index.ts` (the `SYSTEM_PROMPT` constant, lines ~41–270). No schema changes, no UI changes, no new tools. The chat UI already renders whatever `reason` text the Director writes — so swapping "Step 2 of 4" for "Locking the look" is a prompt-only fix.

Optionally, a tiny client tweak in `DirectorChat.tsx` to strip any leftover `Step \d+ of \d+ — ` prefix defensively, in case the model regresses.

## Out of scope (ask if you want them too)

- Adding a "skill chip" picker in the composer that pre-tags the brief as commercial / cinematic / character / story (would make the brief-type router deterministic instead of inferred).
- Persisting the recap as a visible pinned card at the top of the thread so you can edit assumptions before answering.
- Letting the user say "stop asking, just generate" mid-flow to bypass remaining questions.

Want me to ship #1–6 as one prompt rewrite, or pull any of the optional items in too?
