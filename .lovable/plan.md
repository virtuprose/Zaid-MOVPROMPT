## Goal

When the user picks a Format + Hook + Setting (with optional Product / Avatar / Location attached), automatically write a ready-to-shoot scene description into the describe box using AI. Re-write it every time any of those picks change.

## How it works

1. **Trigger**: a `useEffect` watches `formatId | hookId | settingId | customFormat | customSetting | brandKit?.id | characterKit?.id | location.place | subject`. As soon as the required trio (format-or-custom, hook, setting-or-custom) is present, fire a debounced (400ms) call to a new edge function `write-ad-scene`.
2. **Edge function `write-ad-scene`** (Lovable AI, `google/gemini-3-flash-preview`):
   - Input: the three preset fragments (looked up server-side from the same `FORMATS` / `HOOKS` / `SETTINGS` ids — duplicated in the function), subject (product|app), brand `{name, description, tagline, audience}`, character `{name, role, description}`, location `{place}`.
   - Output (structured): `{ scene: string }` — 2–4 sentences, present tense, names the product and avatar explicitly, opens on the hook beat and ends on a hero shot.
   - System prompt tells it to write a director's beat-by-beat, not marketing copy, and to keep it under 90 words.
3. **Apply to the box**: result replaces `master` state. Per the user's pick, every new trio change rewrites — including over edits the user made.
4. **UX while writing**:
   - Textarea shows a small inline shimmer placeholder ("Writing scene…") while the fetch is in flight; disable Generate during that window.
   - Abort in-flight request when a new trio change comes in (`AbortController`).
   - On AI error: keep whatever was there, toast a small "Couldn't draft scene — type your own."
5. **Prompt composition stays the same** — `composeStudioPrompt()` already uses `master` as the Story line, so the AI-written scene flows straight into the final Seedance prompt alongside the Brand / Character / reference image lines.

## Scope

- New: `supabase/functions/write-ad-scene/index.ts` (Lovable AI Gateway, structured output via `Output.object`).
- Edited: `src/pages/MarketingStudio.tsx` — add the debounced effect, abort controller, "Writing scene…" state, and replace `master` with AI result.
- Edited: `src/lib/director/api.ts` — thin `writeAdScene(brief): Promise<string>` helper.

## Out of scope

- No "Regenerate" button, no template/manual modes (user picked auto-rewrite-every-time).
- No changes to Format / Hook / Setting catalogs, render endpoint, or reference-image plumbing.
- No persistence of generated drafts — they live only in component state.

## Notes / risks

- Overwriting user edits on every chip change is by design (user's pick). If a user types and then nudges a chip, their text is replaced. We can add a "lock" toggle later if it becomes annoying.
- Latency ~1–2 s per pick. The debounce + shimmer cover it; Generate is gated until the draft lands.
