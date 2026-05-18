
# Tame the Render Dialog Jargon

Move power-user knobs out of the main flow so the dialog reads like creative decisions, not ML parameters.

## Changes — all in `src/components/director/VideoOptionsDialog.tsx`

### 1. Rename `cfg_scale` → "Creative freedom"

- Label: **Creative freedom**
- Replace the numeric readout (`0.50`) with a plain-language tag derived from the slider value:
  - `≤ 0.3` → "Let model improvise"
  - `0.3 – 0.7` → "Balanced"
  - `≥ 0.7` → "Follow prompt strictly"
- Slider stays 0.1–1.0, step 0.05 (no schema change — still sends `cfg_scale` to the edge function).
- End-labels under the slider: `Improvise` ←→ `Strict`
- Small `(?)` tooltip with one sentence: "How strictly the model follows your written prompt vs. taking creative liberties."

### 2. Rename "Prompt optimizer" → "Auto-refine prompt"

- Helper text: "Let the model polish your prompt before rendering."

### 3. Add collapsible **Advanced** section

- Place a `<button>` row near the bottom of the controls block: `▸ Advanced` (chevron rotates when open).
- Collapsed by default.
- Moves these controls inside:
  - **Creative freedom** (cfg_scale)
  - **Auto-refine prompt** (prompt_optimizer)
- Keeps in the main (always-visible) section:
  - Aspect ratio
  - Duration
  - Resolution
  - Audio

### 4. State + a11y

- Local `const [advancedOpen, setAdvancedOpen] = useState(false)`.
- Button gets `aria-expanded` + `aria-controls`; the panel gets a matching `id`.
- Reset `advancedOpen` to `false` whenever the dialog reopens (mirror the existing `useEffect` keyed on `open`).

## Out of scope

- No changes to `videoModelControls.ts` (controls map stays as-is).
- No changes to edge function payload — same keys (`cfg_scale`, `prompt_optimizer`) still go out.
- No changes to Director routing or `locked_spec`.
- Other models' dialogs unaffected (they don't expose these fields).

## Acceptance

- Opening render settings for a Kling v3 model shows only aspect/duration/resolution/audio by default.
- An "Advanced" toggle reveals Creative freedom + Auto-refine prompt.
- Moving the slider updates the plain-language tag in real time; backend payload still contains `cfg_scale: <number>`.
- Hailuo-02-pro dialog shows Advanced (with just Auto-refine prompt inside) — no orphan section if both Advanced fields are unsupported (hide the toggle entirely in that case).

## Files touched

- `src/components/director/VideoOptionsDialog.tsx`
