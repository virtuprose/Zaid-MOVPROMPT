

## "Enhance my vision" — AI rewrite for the Describe textarea

A button beneath the Describe textarea sends the user's draft to Lovable AI, which rewrites it into a clearer, director-grade brief. The result opens in a side-by-side diff dialog: original vs enhanced. The user clicks **Apply** to replace, or **Keep original** to dismiss. Generic cinematic style — same prompt for all target models.

### UX flow

1. Below the Describe textarea, render a small ghost button: `✨ Enhance my vision`.
   - Disabled when `description.trim().length < 10` (tooltip: "Write a few words first").
   - Shows spinner + "Enhancing…" while loading.
2. On click → POST current `description` (and lightweight scene context) to a new edge function `enhance-description`.
3. On success → open an `AlertDialog` showing two columns:
   - **Your draft** (read-only, muted)
   - **Enhanced** (read-only, primary border, slightly highlighted)
   - Actions: `Keep original` (cancel) · `Apply enhanced` (primary).
4. On Apply → `setDescription(enhanced)`, dialog closes, brief toast "Description enhanced — Undo" with an Undo button that restores the original (8s, mirrors existing Undo pattern).
5. On error → toast with the error (handles 429 rate-limit and 402 credits clearly).

### Backend — new edge function

`supabase/functions/enhance-description/index.ts`
- POST `{ description: string, sceneSummary?: string }`.
- Auth: requires Supabase JWT (same pattern as `analyze-scene` / `generate-prompt`).
- IP rate limit (in-memory, same helper style as siblings).
- Calls Lovable AI Gateway `https://ai.gateway.lovable.dev/v1/chat/completions`, model `google/gemini-3-flash-preview`, non-streaming, `temperature` low.
- System prompt (generic cinematic, model-agnostic):
  > You rewrite a user's short scene description into a clear, vivid director's brief for an AI video generator. Preserve the user's intent and any `@N` mentions verbatim. Add concrete cinematic details only where the draft is vague: subject action, camera move, framing, lighting quality + direction, mood, pacing. Keep it 2–4 sentences, plain prose, no lists, no headings, no emojis. Do not invent characters, locations, or objects the user didn't imply. Output only the rewritten description text — no preamble.
- Optional `sceneSummary` (compact list of detected elements like "@1 woman, @2 window, @3 coffee cup") is appended as user-message context so the rewrite respects the scene.
- Returns `{ enhanced: string }`. Surfaces 429/402 with structured error body.

### Frontend changes

**`src/components/WorkflowPanel.tsx`**
- New state: `enhanceOpen`, `enhanceLoading`, `enhancedDraft: string | null`, `enhanceUndoSnapshot: string | null` + 8s timer ref.
- Build a compact `sceneSummary` from `flatSceneElements` (e.g. `@1 person, @2 window…`) when calling.
- Render the **Enhance my vision** button as a small inline row immediately under the `descriptionBlock`, aligned end (mirrors in RTL).
- Render an `AlertDialog` with the diff layout (responsive: side-by-side ≥ md, stacked < md).
- Apply handler: snapshot current `description`, `setDescription(enhanced)`, open Undo toast (or render the existing Undo-row pattern if you prefer consistency — reuse the same component shape used for badges Undo).

**No new component file required**; the diff dialog is inline JSX inside `WorkflowPanel`.

### Translations

Add to `src/i18n/translations/en.ts` and `src/i18n/translations/ar.ts`:

| Key | EN | AR |
|---|---|---|
| `enhance.button` | Enhance my vision | حسّن رؤيتك |
| `enhance.tooltip.short` | Write a few words first | اكتب بضع كلمات أولاً |
| `enhance.loading` | Enhancing… | جارٍ التحسين… |
| `enhance.dialog.title` | Compare your description | قارن الوصف |
| `enhance.dialog.original` | Your draft | مسودتك |
| `enhance.dialog.enhanced` | Enhanced | النسخة المحسّنة |
| `enhance.apply` | Apply enhanced | تطبيق المحسّن |
| `enhance.cancel` | Keep original | الاحتفاظ بالأصلي |
| `enhance.applied` | Description enhanced | تم تحسين الوصف |
| `enhance.undo` | Undo | تراجع |
| `enhance.error.generic` | Couldn't enhance — try again | تعذّر التحسين — حاول مرة أخرى |
| `enhance.error.rateLimit` | Too many requests — wait a moment | طلبات كثيرة — انتظر لحظة |
| `enhance.error.credits` | AI credits exhausted | انتهت أرصدة الذكاء الاصطناعي |

### Files touched

- **New**: `supabase/functions/enhance-description/index.ts`
- **Edit**: `src/components/WorkflowPanel.tsx` — button, dialog, handlers, Undo
- **Edit**: `src/i18n/translations/en.ts`, `src/i18n/translations/ar.ts` — new keys

No DB schema changes. No other components touched. `LOVABLE_API_KEY` is already provisioned via Lovable Cloud — no secrets prompt needed.

