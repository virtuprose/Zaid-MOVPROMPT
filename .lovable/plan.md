## What I found

I tested both edge functions directly with your auth token and **both deployed correctly and returned 200** when called normally:

- `enhance-description` → returned a real enhanced paragraph successfully ✅
- `generate-prompt` → reached the validation layer and returned a structured 400 ✅

So the functions are healthy. The two red toasts in your screenshots come from the **client catch-blocks**, which throw away whatever specific error the server actually returned and just show a generic message:
- `"Edge Function returned a non-2xx status code"` (generic Supabase SDK message)
- `"Couldn't enhance — try again"` (generic translation key)

That means right now we have **no idea** which of these is actually happening:
1. AI gateway **429** rate limit (you triggered enhance + generate + regenerate-compact within seconds)
2. AI gateway **402** credits exhausted on `google/gemini-2.5-pro`
3. The Gemini Pro vision call timing out on heavy element-reference payloads
4. Schema/tool-call rejection from the model on a specific prompt

## Plan

### 1. Surface real error messages in the UI (root fix)
- **`src/components/WorkflowPanel.tsx`** `handleGenerate` & `handleEnhanceClick`: when `supabase.functions.invoke` fails, read `error.context?.body` (or do a manual `fetch` so we can read the JSON `{ error }` field) and show it inside the toast — e.g. *"AI rate limit, please wait 60s"* / *"AI credits exhausted"* / *"Image too large"*.
- This alone will tell us in one more attempt exactly which of the 4 causes is hitting you.

### 2. Add automatic fallback model in `generate-prompt`
- **`supabase/functions/generate-prompt/index.ts`**: if `google/gemini-2.5-pro` returns 429 or 402, **retry once** against `google/gemini-2.5-flash` (still vision-capable, much cheaper, almost never rate-limited) and add `modelNotes: "⚠ Generated with fallback model"`.
- Same fallback for `enhance-description`: if `gemini-3-flash-preview` 429/402, retry on `gemini-2.5-flash`.

### 3. Improve client-side throttling
- **`src/components/ResultsPanel.tsx`**: after clicking *Regenerate compact*, disable the button for 8 seconds to prevent rapid-fire calls that would trip the 5-req/min IP rate limiter inside the edge function itself.
- **`src/components/WorkflowPanel.tsx`**: same on *Enhance Description*.

### 4. Friendlier translated error strings
- **`src/i18n/translations/en.ts`** + **`ar.ts`**: add `errors.aiRateLimit`, `errors.aiCreditsExhausted`, `errors.aiTimeout`, `errors.aiUnknown` so the toast carries actionable copy in both languages.

## Files to be modified
- `src/components/WorkflowPanel.tsx`
- `src/components/ResultsPanel.tsx`
- `supabase/functions/generate-prompt/index.ts`
- `supabase/functions/enhance-description/index.ts`
- `src/i18n/translations/en.ts`
- `src/i18n/translations/ar.ts`

## Why not just "fix" the edge functions?
Because — verified by direct curl — they aren't broken. The failure is upstream (AI gateway state) and the UI is hiding it from us. After step 1 ships, the very next failure will tell us the exact upstream cause in plain English, and step 2 will make most of those failures self-heal automatically.