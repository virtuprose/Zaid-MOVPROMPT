
## Cancel button for active preset generations

Add a per-card **Cancel** action while a preset preview is generating. Cancel is **client-side only** (no Fal API change): it stops the polling loop and flips the card to a `canceled` state with a clear visual + a one-click way to re-generate. The Fal job continues server-side, and if it eventually completes the next `refresh()` will still pick up the file from storage — but the UI no longer waits on it.

### What changes — `src/components/admin/PresetPreviewsSection.tsx`

1. **Status type** gains `"canceled"`:
   ```ts
   type CardStatus = "idle" | "generating" | "error" | "canceled";
   ```

2. **Cancellation registry** (`useRef<Record<string, boolean>>({})`) — `cancelRequested.current[presetId] = true` flips the flag; the polling loop checks it on every tick.

3. **`generateOne` loop** — at the top of each poll iteration (and immediately after submit returns), check `cancelRequested.current[presetId]`. If set:
   - Clear `cancelRequested.current[presetId]`.
   - Clear `genStarts[presetId]`.
   - `setStatuses(... "canceled")`.
   - Return `{ ok: false, code: "canceled" }` (no toast — handled below).

4. **`handleGenerateOne`** — when result is `code === "canceled"`, show a neutral `toast.info("Canceled")` instead of the error toast. Resetting status (clicking Generate again) clears `canceled`.

5. **Cancel button UI** — inside the generating overlay (next to the elapsed timer), add a small ghost button:
   ```tsx
   <Button size="sm" variant="ghost" className="h-6 px-2 gap-1" onClick={() => requestCancel(preset.id)}>
     <X className="w-3 h-3" /> Cancel
   </Button>
   ```
   `requestCancel(id)` simply sets the ref flag and shows a "Canceling…" sub-label until the loop notices (within ~4s, the current poll interval).

6. **Canceled card state** — when `status === "canceled"`:
   - Show a muted info chip on the card body (similar styling to the error chip but using `bg-muted text-muted-foreground`):
     `Canceled — job may still complete server-side. Refresh to check.`
   - The primary button label becomes **"Generate again"** and clears the canceled state on click (it just calls `handleGenerateOne` which resets `statuses[id]` to `"generating"`).

7. **No backend / SQL / edge-function changes.** Out of scope: Fal-side cancellation API (their queue doesn't expose a stable cancel endpoint for the v1 standard model, and a true cancel would still bill for inference already in flight).

### Files touched
- `src/components/admin/PresetPreviewsSection.tsx`

### Out of scope
- Server-side cancel call to Fal.
- i18n strings (this section is hardcoded English, matching the rest of the component).
- Persisting canceled state across refresh (it's an in-memory UI signal).
