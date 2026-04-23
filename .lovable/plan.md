

## Add a "Back" button after Skip / Analyze Scene

**Problem:** Once the user clicks **Skip** or **Analyze Scene**, the workflow advances to the `breakdown` phase. The only way back is **Start Over**, which wipes uploaded images, scene frames, and any direction work. There's no lightweight way to return to the Skip / Analyze choice and pick the other option.

### Change (single file: `src/components/WorkflowPanel.tsx`)

Add a **Back** button next to the existing **Start Over** / **Re-analyze** row at the top of the right panel (the `phase === "breakdown" | "generate"` toolbar around lines 988–1003).

**Behavior:**
- Returns the user to `phase: "upload"` so the Analyze Scene / Skip CTA pair becomes visible again.
- **Preserves** uploaded images, model selection, description text, and any element directions — only resets `phase`. (This is what differentiates it from Start Over, which resets everything.)
- Also clears `sceneFrames` only when the user came from Skip (frames empty) — if they had analyzed, keep the frames so re-entering breakdown via Skip-then-Analyze isn't required; clicking Analyze again will refresh them, and clicking Skip will set frames to `[]` as it already does.
- Hidden when `isAnalyzing` or `isLoading` is true to avoid mid-request navigation.
- Disabled / hidden if `phase === "generate"` AND `results` exist (going back after a successful generation should use Start Over to avoid confusion); only show Back when `phase === "breakdown"` or `phase === "generate" && !results`.

**Placement & styling:**
- Insert it as the first item in the existing flex row at line 990, before `startOverBtn`:
  ```
  [ ← Back ]   [ ↺ Start Over ]                          [ 🔍 Re-analyze ]
  ```
- Match the ghost variant + small size already used by Start Over for visual consistency. Use `ArrowLeft` icon from `lucide-react` (already imported elsewhere — verify and add if missing). Label hidden on `<sm` like the others (`hidden sm:inline`).
- RTL: use the logical `me-`/`ms-` Tailwind utilities the file already follows; the `ArrowLeft` icon should flip to point right under RTL — handle with `rtl:rotate-180` on the icon.

### Translations

Add a new key in both translation files:
- `src/i18n/translations/en.ts`: `"wp.back": "Back"`
- `src/i18n/translations/ar.ts`: `"wp.back": "رجوع"`

### Out of scope

- No change to Start Over, Re-analyze, Skip, or Analyze Scene logic.
- No change to upload-phase UI.
- No state model refactor — Back simply flips `phase` back to `"upload"`.

### Verification

1. Upload an image → click **Skip** → land on breakdown with empty scene frames → click **Back** → CTA pair reappears with image still mounted → click **Analyze Scene** → scene frames populate normally.
2. Same flow but Analyze first → Back → Skip → confirm phase transitions and image persists.
3. Confirm Back is hidden during analyze/generate spinners and after a successful generation.
4. Toggle Arabic — confirm the arrow icon flips and label reads "رجوع".

