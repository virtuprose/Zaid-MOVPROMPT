## Goal

The "Describe your ad" box is currently a single-line `<input>` inside a fixed-height container (`h-11`), so as you type, the text scrolls horizontally on one line instead of wrapping. Convert it to a multi-line, auto-growing textarea so the box gets taller as you add lines.

## Change (single file: `src/pages/MarketingStudio.tsx`, lines 956–977)

1. Replace the fixed-height wrapper (`h-11`) with a min-height container that grows with content. Drop `items-center` for `items-start` so the mic and clear buttons stay aligned at the top as the textarea grows.

2. Swap `<input type="text">` for `<textarea rows={1}>` with:
   - Same value/onChange/maxLength/aria-label/placeholder.
   - `resize-none` and `overflow-hidden` so the user never sees scrollbars.
   - An `onInput` handler that auto-resizes: reset `height` to `auto`, then set it to `scrollHeight` (capped at ~140px so it doesn't grow forever).
   - A small `useEffect` that runs the same resize when `userNote` is set programmatically (e.g., voice dictation via `DescribeAdMic`, "Reuse" pre-fill).

3. Keep mic + clear buttons inline on the right at the top edge (`mt-1.5` or similar so they sit on the first line).

## Out of scope

- No layout changes elsewhere on the page.
- No change to the 280-char limit or the example chips below the box.