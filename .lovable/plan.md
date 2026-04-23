

## Add Back button above the Generate CTA

**Problem:** After Skip, the user lands on the breakdown phase but the existing Back button is nested inside the right-panel scene-frames toolbar (`WorkflowPanel.tsx` line 1010), which only renders when `sceneFrames.length > 0`. With no analyzed frames, that toolbar never shows — so there's no visible way back to the Analyze / Skip choice from the screen in your screenshot.

### Change (single file: `src/components/WorkflowPanel.tsx`)

Add the Back button to the left-column CTA block, directly above the **Generate Cinematic Prompt** button, so it's always reachable from the same scroll position as the primary action.

**Where:** Inside the `ctaRowBlock` "generate" branch (lines 915–932), wrap the existing Generate button in a vertical stack and prepend the Back button.

**Layout:**
```
─────────────────────  (existing top border)
        [ ← Back ]              ← new, ghost / muted, small
   [ Generate Cinematic Prompt ] ← unchanged
```

- Use the **existing `backBtn` constant** (already defined at line 988 with correct visibility rules: hidden during analyze/generate spinners and after successful generation) — no new logic needed.
- Center it above the Generate button with a small gap (`gap-3`).
- Keep the existing top border + `pt-6 mt-6` spacing on the wrapper.
- Show label on all sizes here (drop the `hidden sm:inline` for this instance) so it reads "← Back" clearly even on mobile, since it's the only navigation cue on this screen.

**Implementation note:** To avoid duplicating the button JSX, render `backBtn` inline in the CTA block with a wrapper that overrides the `hidden sm:inline` on its label — simplest path is to inline a second small Back button (size="sm", ghost) in `ctaRowBlock` rather than reusing `backBtn`, since the right-toolbar version should keep its compact styling. Roughly 8 lines added.

**Right-toolbar Back button (line 1010):** unchanged — still appears when scene frames exist, for users who took the Analyze path.

### Out of scope

- No change to Start Over, Skip, Analyze, or Generate logic.
- No change to phase state model — Back still just calls `setPhase("upload")`.
- No translation changes (`wp.back` already exists in EN/AR).
- No restyle of the Generate button itself.

### Verification

1. Upload image → Skip → see **Back** centered above **Generate Cinematic Prompt** → click Back → returns to Analyze / Skip choice with image preserved.
2. Upload image → Analyze → Back appears in both the right-panel toolbar (above scene frames) AND above Generate in the left column.
3. While generating (spinner), Back disappears from above Generate.
4. RTL: arrow flips correctly (existing `rtl:rotate-180` class).

