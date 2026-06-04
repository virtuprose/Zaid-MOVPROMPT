# Add cancel button to voice recording

When recording is active, show an X (cancel) button next to the stop button so users can discard the recording without transcribing — matching the Lovable composer mic UX.

The `useVoiceCapture` hook already exposes a `cancel()` function that stops the recorder and resets state to idle without uploading or transcribing. We just need to surface it in the UI.

## Changes

### `src/components/ConfigPanel.tsx`
- While `isRecording`, render a small ghost X button next to the mic stop button.
- onClick → `cancel()` from `useVoiceCapture`.
- Pull `cancel` from the hook destructure (currently unused).
- aria-label / title: "Cancel recording" (with translation key `config.cancelRecording`).

### `src/components/marketing/DescribeAdMic.tsx`
- Same treatment: when `isRecording`, render an X button beside the stop button calling `cancel()`.
- Pull `cancel` from the hook.

### Layout
- X button sits to the left of the mic stop button (after the elapsed timer in DescribeAdMic, before the mic in ConfigPanel).
- Styled as a small circular ghost button (`w-7 h-7` / `w-8 h-8` to match each context), muted foreground, hover → foreground. No destructive color so it doesn't compete with the red stop button.

### i18n
- Add `config.cancelRecording` → "Cancel recording" (en) and Arabic equivalent in `src/i18n/translations/{en,ar}.ts`.

## Out of scope
- No changes to the hook itself (cancel already exists).
- No changes to transcribing state — cancel only shows during `recording`.
