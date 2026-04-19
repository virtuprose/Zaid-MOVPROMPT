

User wants the **ultra-detailed cinematic shooting-script style** (the 3,500-word football trailer they just shared) as the output format for **Seedance models only**. This means dramatically expanding Seedance's `mainPrompt` from 200–350 words into a full multi-section shooting script with timecoded sequences, per-cut breakdowns, lighting plans, color grading specs, and audio design blocks.

## Scope

Apply the new "shooting script" output format to **all Seedance variants**:
- Seedance 2.0 / 2.0 Fast
- Seedance Pro / Pro Fast (single + multi-shot 5)
- Seedance 1.5 Pro

Other models (Kling, Veo, Higgsfield, Sora, etc.) keep their current formats — unchanged.

## Plan

### 1. Expand Seedance system addendum
`supabase/functions/generate-prompt/experts/seedance.ts`:

Replace the current "200–350 words" rule with a **structured shooting-script format**. The agent must output `mainPrompt` as a multi-section script containing:

- **Section headers** in `[BRACKETS]` with timecodes: `[OPENING — 0s to 1.5s | TITLE]`
- **Numbered cuts** within each section (`Cut 1: ...`, `Cut 2: ...`)
- Each cut: framing + lens + camera move + lighting note + action beat
- Mandatory closing blocks:
  - `[GLOBAL CAMERA SPECIFICATIONS]` — lens rotation, framerate, aspect ratio, grain
  - `[LIGHTING SUMMARY]` — per-sequence lighting plan with Kelvin temps
  - `[COLOR GRADING]` — hue degrees, saturation, shadow/highlight treatment
  - `[AUDIO DESIGN]` — timecoded BPM progression, instruments, foley
  - `[ABSOLUTE RULES]` — continuity rules, face-reveal restraint, etc.

**Length targets** (raised from current):
- Seedance 2.0 / Pro / 1.5 Pro: **1,500–3,500 words**
- Seedance 2.0 Fast / Pro Fast: **800–1,500 words** (compressed but same structure)
- Multi-shot mode (5 shots): each shot is its own mini-script (~600–900 words each)

### 2. Update example block
Replace the current single-paragraph dancer example with a **condensed shooting-script example** (~600 words) demonstrating the bracketed-section format, so the AI learns the exact pattern.

### 3. Reinforce rules
Add to Seedance addendum:
- "mainPrompt is a SHOOTING SCRIPT, not a paragraph"
- "Use [BRACKETED SECTION HEADERS] with timecodes"
- "Number every cut within each section"
- "Always include the 5 closing blocks (Camera Specs / Lighting / Color / Audio / Rules)"
- "Output is a complete pre-production document the user can hand to a DP"

### 4. Keep other fields aligned
- `audioBlock`: still populated as the structured DIALOGUE/SFX/AMBIENT triplet (separate from the in-script audio design block — the standalone field is for quick reference)
- `shotStructure`: kept for non-multi-shot Seedance as the timecoded skeleton
- `negativePrompt` / `referenceGuidance` / `modelNotes`: unchanged

### 5. No changes to
- Other expert agents (Kling, Veo, Higgsfield, generic) — they keep current formats
- UI / contracts / translations
- Database / schema

### Files touched
- `supabase/functions/generate-prompt/experts/seedance.ts` (addendum + example rewrite)

No DB changes, no new secrets. Edge function deploys automatically — no Publish required for this change to reach published users.

