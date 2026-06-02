## Goal
Fix the Director so it clearly tracks what the user already said, asks more logical next questions, and makes the step-by-step flow understandable from the first turn.

## Plan
1. **Tighten conversation grounding**
   - Audit the serialized history sent to the Director and improve how prior answers, prior questions, generated frames, chosen models, and locked specs are represented.
   - Make sure recent user answers outrank older brainstorming text so the Director stops re-asking or contradicting confirmed details.

2. **Add question deduping + answer-awareness**
   - Add a client/server guard so if a question was already answered or a spec is already locked, the Director won’t ask it again.
   - Normalize common answers like duration, aspect ratio, audio, and “go straight to video / key frame first” so the next turn advances instead of looping.

3. **Make step 1 and step transitions explicit**
   - Improve the first-step logic so the Director chooses the correct path more reliably: anchored image flow, key-frame-first flow, direct-to-video flow, or story flow.
   - Ensure every clarification reason is visibly step-labeled and reads like progress, not random questioning.

4. **Improve clarity in the Director panel**
   - Refine the wording/rendering of question cards so the user can tell: what step they’re on, why this question is being asked, and what happens next.
   - Keep the interaction one-question-at-a-time, but make the sequence feel coherent.

5. **Validate with focused regression checks**
   - Cover cases where the user already gave enough info, changed direction mid-flow, uploaded references first, or moved from key frame to storyboard/video.
   - Verify the Director advances logically instead of repeating or asking off-topic questions.

## Technical details
- Likely touchpoints:
  - `src/components/director/DirectorChat.tsx`
  - `src/lib/director/api.ts`
  - `src/lib/director/sessionContext.ts`
  - `supabase/functions/director-agent/index.ts`
- Main implementation focus:
  - Better history serialization
  - Locked-spec precedence
  - Repeated-question suppression
  - Clearer step-state messaging
  - Regression tests around routing/grounding behavior