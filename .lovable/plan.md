

## Rename VidoPrompt → MovPrompt

Update all branding references across the codebase:

### Files to change

1. **`index.html`** — Update `<title>` and all meta tags (og:title, description, etc.)
2. **`src/pages/Index.tsx`** — Change hero title from `Vido<span>Prompt</span>` to `Mov<span>Prompt</span>`, update footer text
3. **`supabase/functions/generate-prompt/index.ts`** — Update any brand references in the system prompt
4. **`.lovable/memory/index.md`** — Update project name in memory

