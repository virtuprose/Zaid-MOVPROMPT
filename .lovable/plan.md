# Fix story-mode no-response after aspect selection

## What I’ll change
1. Add the missing `generate_story_bundle` response handling in `src/components/director/DirectorChat.tsx` so the app immediately starts the story asset bundle after the user picks `16:9` / `9:16` / `1:1`.
2. Convert the bundle result into the existing `location_picker` UI bubble, wiring in the returned character sheet, prop sheet, and 7 generated locations.
3. Hook up location selection so choosing or dragging a location sends the expected follow-up (`Location chosen: <index>`) back to the director.
4. Handle the `request_story_render` response kind so the app launches the 4 parallel act renders, then shows the existing `ActStrip` and stitch flow.
5. Update any stale story copy that still says `8 acts` inside the location-picker step.

## Expected result
- User picks a story concept.
- User answers the aspect ratio once.
- Director automatically builds the story asset bundle.
- UI shows the 7-location picker instead of `(no response)`.
- After the user picks one location, the 4 acts start rendering in parallel and the 1-minute stitch flow continues.

## Technical details
- The backend is already returning `generate_story_bundle`; the frontend currently falls through because `send()` only handles `generate_prompt`, `ask_clarification`, `ask_model_choice`, `generate_reference_image`, and `request_video_generation`.
- I’ll keep this entirely in the frontend chat orchestration layer unless I find a small payload mismatch while wiring the existing components.
- Validation target: confirm the preview advances from aspect selection into the location picker, then into the 4-act strip.