## Got it — two cases

**Case A — User asks for a sheet directly** ("make a character sheet of…", "I need a product sheet for X"):
The Director builds the sheet. The existing `SubjectLockChoiceCard` chip already acts as confirmation, then the sheet is generated. ✅ Already works.

**Case B — User describes the WHOLE scene** (environment + character/product + shot + lighting + mood) in their brief, intending a key frame:
The Director should:
1. Recognize the brief is already complete.
2. Still offer the subject-lock confirmation (character / product / none) so we can pin a sheet for later consistency.
3. After the sheet returns, **skip the "describe the opening key frame" step** (we already have it).
4. Go straight to aspect-ratio chip → render the key frame using the **user's original full description verbatim**, not a re-asked re-described version.

Today, step 3 doesn't skip — the client always shows `scene_describe` after a sheet is built. That's the bug.

## Fix

### `supabase/functions/director-agent/index.ts`

Add an optional flag to the `generate_reference_image` tool:
```ts
scene_already_described: {
  type: "boolean",
  description:
    "Set TRUE for mode=single_panel when the user's brief already includes the full key-frame scene (environment + subject + camera + lighting + mood). The client will skip the 'describe the opening key frame' step after the subject sheet and render the key frame from your prompt verbatim. Set FALSE (or omit) when the brief only names a subject and a scene description is still needed.",
}
```

Update the workflow note (line ~187) so the model knows when to set it:
> POST-SHEET FLOW: after a character/product/object sheet is generated, the client will ask the user to describe the opening key frame UNLESS you set `scene_already_described: true` on the original `generate_reference_image` call. Set it true when the user's brief already paints the full scene; set it false (or omit) when only the subject was given.

### `src/components/director/DirectorChat.tsx`

1. Extend the `subject_lock_choice` and `scene_describe` bubble payload types with an optional `scene_already_described?: boolean` flag.
2. In the `resp.kind === "generate_reference_image"` handler (line ~957), forward `resp.scene_already_described` into the `payload` used for `subject_lock_choice` / `aspect_choice`.
3. In `handleSubjectLockChoice` (kind !== "none" branch), after the sheet returns:
   - If `target.payload.scene_already_described === true` → append `aspect_choice` directly with the original payload (no `scene_describe`).
   - Otherwise → append `scene_describe` as today.
4. `DirectorMsg` / `AgentResponse` type in `src/lib/director/api.ts`: add the new optional field on the `generate_reference_image` response so TS stays clean.

## Out of scope

- Heuristic auto-detection of "rich brief" on the client. We let the Director model decide via the flag — it already reads the brief.
- Changing case A (direct sheet request).
- Storyboard / multi-shot flow.
