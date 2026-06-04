## Goal
Make each task row in the sidebar render on a single line (no wrapping), truncating overflow with an ellipsis.

## Plan
1. In `src/pages/Director.tsx`, change the task row button from the current 2-line clamp to a single-line layout: remove the `-webkit-box` / `WebkitLineClamp: 2` styles and use `truncate` (white-space: nowrap + overflow hidden + text-ellipsis).
2. Keep the kebab spacing (`pr-9`) and active/hover styles intact so the menu trigger stays visible.

## Technical details
- Replace the inline `style` (line-clamp) on the row button with Tailwind `truncate`, and drop `break-words` and `leading-snug` since the row is now one line.
- No other behavior or styling changes.