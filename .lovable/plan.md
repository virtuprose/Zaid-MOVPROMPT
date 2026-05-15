## Goal

Add a **Marketing Studio** entry point in the Director that opens a guided ad-brief flow on the right side of the workspace when the user starts a New Task. Output is a fully composed prompt sent to **Seedance 2.0** (already wired in `generate-video`).

It mirrors the Higgsfield reference: pick a Subject (Product / App), then layer a Format, Hook, and Setting from curated libraries, optionally seed with a viral Ad Reference or a product URL, then generate.

## Is it worth shipping now?

Yes — recommended. Reasons:
- All plumbing exists: Seedance 2.0 model id, `generate-video`, prompt expert agents, video options dialog, approval/credits flow.
- It turns the open "Describe your shot" into a packaged, repeatable use case (ads) — much higher conversion for marketing users than a blank prompt.
- It's purely additive: a new entry mode + curated content tables, no rewrite of the Director chat.

Scope this v1 to **curated presets only** (no scraping product URLs, no viral-ad video analysis yet). Those become v2 once the core flow proves out.

## v1 Scope

1. **Entry point** — on the Director sidebar, alongside `+ New Task`, add `+ Marketing Studio`. Also surface as a card on the empty Director state.
2. **Right-side Studio panel** (sheet/drawer on mobile, right column on desktop ≥1024px) with the composer:
   - **Subject toggle:** Product · App (left rail, like the screenshot)
   - **Master prompt input:** "Describe what happens in the ad…"
   - **Three preset pickers** opening modal galleries:
     - **Format** ("Pick the format that hits") — UGC / Tutorial / Unboxing / Hyper Motion / Commercial …
     - **Hook** ("Hooks that stop the scroll") — Product Hit / Spicy / Interview / Random Object Mic …
     - **Setting** ("Settings that set the scene") — Bedroom / Nature / Rooftop / Airplane Wing …
   - **Reference slots:** Product image, Avatar image (reuse existing `AttachmentDropzone`)
   - **Generate** button → cost chip → existing `ConfirmRightsDialog` → `generate-video` with `provider: "seedance-2.0"`
3. **Prompt assembly** — combine Subject + Format.template + Hook.template + Setting.template + user master text into one Seedance-tuned prompt via the existing `seedance` expert agent in `generate-prompt`. Studio sends a structured payload; expert returns the final prompt.
4. **Persistence** — store the brief on the existing `director_sessions` row (new jsonb column `studio_brief`) so reopening a task restores selections.

## v2 (later, not now)

- **Url to Ad** — call a scraper edge function to pull product image/title and prefill the brief.
- **Ad Reference** — upload a viral ad video, run a vision pass to extract hook/format/setting, prefill pickers.
- Saved brand kit (logo, palette, voice) reused across briefs.

## Files

**New**
- `src/lib/director/marketingStudio.ts` — typed catalogs: `FORMATS`, `HOOKS`, `SETTINGS`, each `{ id, label, description, thumbnail, promptFragment }`. Start with ~6 entries each, mirroring the screenshots.
- `src/components/director/studio/MarketingStudioPanel.tsx` — right-side composer.
- `src/components/director/studio/PresetPickerDialog.tsx` — reusable gallery modal (tabs: All / category filters, search, thumb grid, description).
- `src/components/director/studio/SubjectRail.tsx` — Product / App vertical toggle.
- `supabase/functions/generate-prompt/experts/seedance-ad.ts` — narrow addendum to the existing `seedance` expert that knows how to weave Format/Hook/Setting fragments into a 5–10s ad prompt with native audio cues.

**Edited**
- `src/pages/Director.tsx` — add "Marketing Studio" sidebar action; route `/director/:sessionId?mode=studio` opens the panel; passes `studio_brief` to chat.
- `src/components/director/DirectorChat.tsx` — when `mode=studio`, render `MarketingStudioPanel` on the right (≥lg) or as a sheet (<lg) instead of the free composer.
- `src/components/director/PromptResultCard.tsx` — when result came from Studio, default `VideoOptionsDialog` model to `seedance-2.0`, aspect `9:16`, duration `5s`, audio on.
- `supabase/functions/generate-prompt/experts/registry.ts` — register the new ad-tuned seedance variant, matched when `intent === "marketing_ad"`.
- `supabase/functions/generate-prompt/index.ts` — accept optional `studio_brief` in the body and forward to expert.

**DB migration**
- Add `studio_brief jsonb null` to `director_sessions`. No RLS changes (already user-scoped).

## Technical notes

- Curated assets: store thumbnails in `public/studio/{format|hook|setting}/<id>.jpg`. v1 uses 6–8 per category — small enough to ship without storage.
- Prompt template shape:
  ```
  {hook.opening} — {format.style} of {subject} in {setting.location}.
  {user master prompt}.
  Audio: {format.audio_cue}. Duration ~{duration}s, 9:16.
  ```
  Final composition lives in the seedance-ad expert, not on the client, so we can iterate without redeploying the app.
- The Studio panel is presentation-only on the client; no business logic moves out of the existing `generate-prompt` / `generate-video` functions.
- Keep the existing free-form Director chat untouched; Studio is a parallel mode toggled per session.
- All new colors/typography reuse existing design tokens — no new palette.

## Open questions

1. **Subjects:** ship just **Product + App** like Higgsfield, or also add **Service / Personal Brand** in v1?
2. **Library size v1:** is 6 presets per category enough, or should I aim for ~12 each (more curation work, more thumbnails)?
3. **Url to Ad / Ad Reference:** confirm we defer both to v2, or do you want at least the URL scraper in v1?
