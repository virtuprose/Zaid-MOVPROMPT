

# Improve Start Over & Re-analyze Button Styling

## Problem
The "Start Over" and "Re-analyze" buttons are tiny ghost buttons with muted text — they're hard to notice and don't feel like intentional UI actions.

## Solution
Style them as proper visible buttons with outline variant, slightly larger size, and better visual presence while keeping them secondary to the main "Generate" CTA.

### Changes in `src/components/WorkflowPanel.tsx`

**1. Breakdown view (with scene frames) — lines 280-298:**
- Change both buttons from `ghost` + `text-xs text-muted-foreground` to `outline` variant, `sm` size, with proper border styling matching the dark cinematic theme
- Use distinct icons: `RotateCcw` for Start Over, `ScanSearch` for Re-analyze
- Add subtle border glow or border-primary/30 styling to make them visible against the dark background

**2. Skip-analysis view (no scene frames) — lines 326-335:**
- Same treatment for the Start Over button there

**Styling approach:**
```
variant="outline"
size="sm" 
className="gap-1.5 border-white/20 text-muted-foreground hover:text-foreground hover:border-primary/50"
```

Single file edit, no backend changes.

