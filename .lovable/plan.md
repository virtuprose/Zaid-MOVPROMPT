

# Remove Lovable Branding from All Pages

## Current State
- The "Edit with Lovable" badge on the published site is **already hidden**
- The internal SDK files (`src/integrations/lovable/index.ts`, `vite.config.ts`, edge function) reference Lovable but are never visible to end users — these must stay as-is (auto-generated)
- **One visible reference**: `index.html` has `<meta name="twitter:site" content="@Lovable" />` — this shows "via @Lovable" when the site is shared on Twitter/X

## Change

### `index.html`
- Change `<meta name="twitter:site" content="@Lovable" />` to `<meta name="twitter:site" content="@MovPrompt" />` (or remove it entirely if you don't have a Twitter/X account for MovPrompt)

That's the only user-facing Lovable branding. Everything else is internal infrastructure code that end users never see.

