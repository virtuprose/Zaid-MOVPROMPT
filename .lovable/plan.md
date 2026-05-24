# Plan — One-click "Animate this panel" on storyboard frames

## Goal
Add a one-click affordance to every storyboard panel that animates that exact frame as the starting image, using **Kling 2.1 Master** (`kling-v2.1-master`) with a motion prompt derived from the panel's locked context. Result drops into the chat as a normal video bubble so the existing player handles preview, polling, and download.

## UX

On each storyboard panel (hover state, alongside the existing Polish / Redo / Download / Expand controls):

- New icon button: **Animate** (Play icon), top-left area of the hover overlay, mirrored opposite the existing Polish wand.
- Click → fires the animation request immediately (no dialog), shows a toast "Animating panel N with Kling 2.1 Master — it'll appear here when ready", and inserts a video bubble in the chat.
- Disabled while a previous animate request for that same panel is in flight (per-panel local state); icon swaps to a spinner.
- Tooltip: `Animate panel N · Kling 2.1 Master`.

No new modal, no model picker, no options. Pre-filled with sensible defaults so the test is genuinely one-click.

Sequence-level affordance (in the action row already containing "Regenerate all", "Re-light all", "Generate 6 more"):
- **Animate all panels** button (Play icon, secondary) — fires the same call for every panel sequentially with a 500ms stagger so we don't slam the API; each lands as its own video bubble in panel order. Confirms once via a small popover ("This will queue N renders on Kling 2.1 Master") to prevent accidental fan-out spend.

## Behavior contract

For each animate click:

1. **Starting frame** = the panel's signed `img.url` (already public/signed for display).
2. **Model** = hard-coded `kling-v2.1-master`.
3. **Prompt** = a short motion-only prompt built from what we already know about the panel:
   - The Director's note for the scene (`data.directorsNote`) if present.
   - A motion stub appropriate for the shot (default: `"Bring this still to life — preserve the exact composition, character, wardrobe, lighting, and color grade. Add subtle natural motion: micro-parallax, breath, atmospheric drift, ambient particles. Camera holds with a slow imperceptible push-in. 5 seconds, cinematic."`).
   - Panel index appended as a tag so the video bubble is traceable back to its source panel.
4. **Reference image** = the panel URL passed via `referenceImages` (Kling i2v path). We reuse the existing `submitVideoJob(prompt, provider, sessionId, options?, referenceImages?)` — no API change.
5. **Options** = `{ duration: 5, aspect_ratio: data.aspectRatio || "16:9" }` if `VideoOptions` supports those keys; otherwise omitted so the function defaults apply.
6. **Extras** = pass `storyboard_session_id` (current session) and `storyboard_shot_index` (panel number) so the video row is correctly attributed in the library.

## Wiring

`GeneratedImageCard.tsx`
- Add prop: `onAnimatePanel?: (panel: { url: string; shot_index: number; directorsNote?: string }) => void | Promise<void>`.
- Add per-panel `animatingIndex` state set for in-flight panels (Set<number>) so we can spin the button.
- Render the new Animate button only when `data.mode === "storyboard_panels"` AND `onAnimatePanel` is provided AND `!inProgress`.
- Sequence-level "Animate all panels" button gated the same way as the existing "Re-light all" (no in-flight panels, no failed panels).

`DirectorChat.tsx`
- Implement `handleAnimatePanel` next to the existing video submission path (~line 1380):
  - Build the motion prompt (helper `buildAnimateFromPanelPrompt(panel, sceneNote)`).
  - Call `submitVideoJob(prompt, "kling-v2.1-master", sessionIdRef.current, options, [panel.url], { storyboard_session_id, storyboard_shot_index })`.
  - On success, push a `Bubble` of role `"video"` with the returned `jobId/status/videoUrl`, persist, toast.
  - On `insufficient_credits` reuse `notifyInsufficientCredits(e)`.
- Pass `onAnimatePanel={handleAnimatePanel}` to every `<GeneratedImageCard ... mode="storyboard_panels" />` mount.
- Implement `handleAnimateAllPanels(panels)` that loops with `await new Promise(r => setTimeout(r, 500))` between calls and surfaces a single summary toast on completion ("Queued N Kling 2.1 Master renders").

## Files to change

- `src/components/director/GeneratedImageCard.tsx` — new `AnimateButton` + sequence-level "Animate all panels" control + new prop, no styling changes outside the existing hover-overlay pattern.
- `src/components/director/DirectorChat.tsx` — new handlers, prop wiring.
- (Optional) `src/lib/director/animatePanelPrompt.ts` — tiny helper to keep the motion-prompt builder out of the component.

## Out of scope (deliberately)

- No Veo branch, no model picker — the user explicitly chose Kling 2.1 Master for this test.
- No new edge function. The existing `generate-video` already accepts `provider`, `reference_image_urls`, `storyboard_session_id`, `storyboard_shot_index`.
- No DB migrations.
- No changes to storyboard generation, character lock, or Layer 3 polish flow.

## Verification

1. Generate a fresh 6-panel storyboard.
2. Hover one panel → click Animate → confirm: toast appears, video bubble shows "queued/processing", panel image is visibly the source frame inside the resulting clip (identity + grade inherited).
3. Click "Animate all panels" → 6 video bubbles appear in panel order; spot-check that panels 1, 4, 6 inherit the locked grade.
4. Check network: each call is `POST /generate-video` with `provider: "kling-v2.1-master"` and a single `reference_image_urls` entry equal to the panel URL.

Expected outcome: clips inherit the cinematic baseline of the storyboard, validating the upstream Layer 1–3 work. If they don't, the bottleneck is the video-prompt construction (Layer 4), not the storyboard.
