# Expand recent ads into a full-size video lightbox

## Goal
On `/marketing`, clicking a card in **Your recent ads** should open the video in a fullscreen overlay at its true aspect ratio (instead of navigating to `/library`).

## Changes — `src/pages/MarketingStudio.tsx` only

1. **Add lightbox state** near the other dialog state:
   ```ts
   const [previewAd, setPreviewAd] = useState<UserAd | null>(null);
   ```

2. **Rewire `UserAdCard` clicks** in both the `mixed` (line 780) and `full` (line ~825) sections:
   - Replace `onClick={() => navigate("/library")}` with `onClick={() => setPreviewAd(ad)}`.
   - Keep Download / Like / Delete actions as-is (they already `stopPropagation`).

3. **Render the lightbox** (new component below the existing Dialogs in the page):
   - Use the existing shadcn `Dialog` already imported in the file (or add the import if missing).
   - `DialogContent` sized `max-w-[95vw] max-h-[92vh] p-0 bg-black border-border/40`.
   - Inside, a centered `<video>` with `controls autoPlay loop playsInline` and `className="max-w-full max-h-[92vh] w-auto h-auto object-contain"` — this preserves the video's intrinsic aspect ratio (9:16, 16:9, 1:1, etc.) automatically.
   - Small caption row with date + Download / Like buttons reusing the existing handlers (`handleDownloadAd`, `handleToggleLike`).
   - Close on backdrop click / Esc (default Dialog behavior).

4. **No backend, schema, types, or routing changes.** `Browse all N →` link still goes to `/library`.

## Out of scope
- `/library` page behavior
- Director chat video viewer (already has its own viewer)
- Storing/reading per-ad aspect ratio in the DB
