## Make the post-sheet "describe key frame" step explicitly optional

### Current behavior
After a character/product/object sheet is generated, the client shows a `scene_describe` QuestionCard. It already has a "Skip" button, but:
- The copy frames it as a required step ("Describe the opening key frame…").
- Skipping currently jumps to aspect choice with **no scene description merged in**, which is fine when the original brief already covered the scene, but the user-facing intent ("this is optional, you can add detail OR go straight to aspect ratio") isn't clear.
- The `scene_already_described` flag from the Director can also auto-skip the card entirely, which hides the optional refinement opportunity the user now wants to always offer.

### Goal
Always surface the "describe the key frame (optional)" affordance after a sheet is built, regardless of how rich the original brief was. The user can either:
1. Add more scene detail → merged into the key-frame prompt → aspect choice → render.
2. Skip → straight to aspect choice → render from the original prompt verbatim.

### Changes

**`src/components/director/DirectorChat.tsx`**
- In `handleSubjectLockChoice` (kind !== "none" branch), remove the `scene_already_described === true` shortcut. Always append the `scene_describe` bubble after the sheet returns.
- Update the `scene_describe` render branch to reflect optional intent:
  - Reason copy: "Optional — add more detail for the key frame, or skip to pick an aspect ratio."
  - Question copy: "Anything to add about the scene? (setting, action, lighting, mood, time of day)"
  - Keep `QuestionCard`'s existing Skip/Continue buttons.
- `handleSceneDescribeSubmit` stays as-is for Continue. For Skip, ensure the existing `onSkip` path appends the `aspect_choice` bubble with the original prompt unchanged (it already does; verify and keep).

**`supabase/functions/director-agent/index.ts`**
- Update the POST-SHEET FLOW workflow note: the client now ALWAYS shows the optional scene-detail step after a sheet. The `scene_already_described` flag is no longer used to skip the step; leave the flag in the schema as a no-op hint (or remove it — see Technical notes) so existing model behavior doesn't break.

**`src/lib/director/api.ts`**
- Leave `scene_already_described` typed as optional. No behavioral coupling on the client anymore.

### Out of scope
- Case A (direct sheet request) flow unchanged.
- Storyboard / multi-shot flow unchanged.
- No new tool calls or backend changes beyond the prompt note.

### Technical notes
- Files touched: `src/components/director/DirectorChat.tsx`, `supabase/functions/director-agent/index.ts` (prompt copy only), optionally `src/lib/director/api.ts` (no-op).
- Decision needed: keep `scene_already_described` as a now-ignored hint (safer, no edge-function redeploy churn) vs. remove it entirely. Recommendation: keep as ignored to avoid breaking in-flight sessions; the prompt note will tell the model it no longer affects the client.
