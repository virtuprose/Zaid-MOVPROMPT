
## Make "Describe Your Vision (optional)" a clear, prominent section

The current trigger is a small muted-foreground row with a chevron — easy to miss and doesn't read like an action or a labeled field. Promote it to an obvious labeled section so users understand this is where they tell the AI what they want from the scene.

### What changes — `src/components/ConfigPanel.tsx`

1. **Replace the muted collapsible trigger** with a proper labeled card header:
   - Bold foreground title `Describe Your Vision` + small `Optional` pill badge.
   - One-line helper underneath: `Tell the AI the mood, action, or style you want for this scene — or pick presets below.` (new i18n key `config.describeVisionHelper`, EN + AR).
   - Keep it collapsible, but use a chevron on the right and a hover/background state so the whole row reads as clickable.
   - Wrap the header + content in a bordered card (`rounded-lg border border-border/50 bg-card/40 p-4`) so it visually anchors as a real form section instead of a faint link.

2. **Open by default** (`useState(true)`) so the textarea is visible on first paint — currently it's collapsed and users don't see the input at all.

3. **Upgrade the textarea**:
   - Add a small inline label `Your description` above it.
   - Replace the generic placeholder with a multi-line example to teach the format:
     ```
     e.g. "Slow push-in on a lone figure walking through a rainy
     Tokyo alley at night, neon reflections, melancholic mood."
     ```
   - Show a live character counter `{n} chars` in the bottom-right of the textarea wrapper.
   - Add a subtle `Clear` ghost button (only when `description.length > 0`).

4. **Section divider** between the description block and the preset picker, with a small caption `Or augment with presets` so the relationship between the two is explicit.

### i18n
Add to `src/i18n/translations/en.ts` and `ar.ts`:
- `config.describeVision.optional` → `Optional`
- `config.describeVisionHelper` → `Tell the AI the mood, action, or style you want for this scene — or pick presets below.`
- `config.yourDescription` → `Your description`
- `config.placeholder` → updated multi-line example above
- `config.clear` → `Clear`
- `config.augmentWithPresets` → `Or augment with presets`
- `config.charsCount` → `{n} chars`

### Out of scope
- Preset picker layout, search, tabs — unchanged.
- No backend or schema changes.

### Files touched
- `src/components/ConfigPanel.tsx`
- `src/i18n/translations/en.ts`
- `src/i18n/translations/ar.ts`
