# Upgrade Director Agent model to Gemini 3.1 Pro

## Change
In `supabase/functions/director-agent/index.ts` (line 371), replace:

```
model: "google/gemini-2.5-flash",
```

with:

```
model: "google/gemini-3.1-pro-preview",
```

This is the only call powering the Director's vision + reasoning loop (scene decomposition, clarifications, prompt generation, model recommendation). All other edge functions (moderation, scene analysis, ad scene writer, etc.) keep `gemini-2.5-flash` since they're auxiliary and cost-sensitive.

## Memory update
Update `mem://index.md` Core line from "Lovable AI (gemini-2.5-flash for vision)" to "Lovable AI (gemini-3.1-pro-preview for Director vision + reasoning)".

## Notes
- `gemini-3.1-pro-preview` is a supported Lovable AI Gateway model — no API key changes needed.
- Expect higher latency and cost per Director turn; the existing 30s idle / 120s total stream timeouts in `src/lib/director/api.ts` remain adequate.
- No client, schema, or tool-call contract changes required — same OpenAI-compatible tool-calling interface.
