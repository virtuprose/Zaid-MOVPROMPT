Add a small Download icon button to the inline video card in the Director chat, placed immediately to the right of the Heart (like) button, before the "Library" link.

## File touched

- `src/components/director/VideoBubble.tsx`

## Change

Inside the action row that today renders Heart + Library, insert a Download button between them:

- Anchor (`<a href={data.videoUrl} download target="_blank" rel="noopener noreferrer">`) wrapping a ghost Button with the lucide `Download` icon.
- Same sizing as the Heart (`h-7 px-2 text-xs`) so it visually groups with it.
- Only rendered when `data.status === "completed"` and `data.videoUrl` exists (the whole footer is already gated on completion, so no extra guard needed).
- Add `Download` to the lucide-react import.

No styling, theme, or other behavior changes. Heart stays leftmost in the action group; Library link stays rightmost.