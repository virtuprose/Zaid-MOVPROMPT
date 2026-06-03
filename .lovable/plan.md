# Fix: Action buttons disappear when More menu opens

## Problem
On the media panel, the top-right action column (Favorite, Download, More) is shown via `opacity-0 group-hover:opacity-100`. When the user clicks More, the dropdown renders in a portal outside the card, so the cursor leaves the card → `:hover` is lost → the whole column (including the More button itself) fades out, leaving only the floating menu.

## Fix
In `src/components/director/MediaRailPanel.tsx` (`MediaCard`):

1. Add local state `const [menuOpen, setMenuOpen] = useState(false)` and pass `open={menuOpen} onOpenChange={setMenuOpen}` to the More `DropdownMenu`.
2. Force the top-right action column and the bottom-right "Add to task" pill to stay visible while `menuOpen` is true — e.g. change the wrapper classes from `opacity-0 group-hover:opacity-100 focus-within:opacity-100` to a `cn(...)` that adds `opacity-100` when `menuOpen`.
3. No other behavior changes.

This keeps Favorite / Download / More visible the entire time the dropdown is open, matching expected behavior.
