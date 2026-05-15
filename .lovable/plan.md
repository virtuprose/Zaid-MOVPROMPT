# Seedance 2.0 prompt eligibility check + auto-rewrite

## Goal
Before submitting a render to **Seedance 2.0** or **Seedance 2.0 Fast**, call fal.ai's eligibility/moderation endpoint. If the prompt is rejected, ask the AI Director to rewrite it safely, re-check, then submit. Show the user what happened.

Other model families (Veo, Kling, etc.) keep today's flow — no eligibility step.

## User flow

1. User clicks **Render with Seedance 2.0** in `VideoOptionsDialog`.
2. Dialog stays open and shows an inline status: *"Checking prompt eligibility…"*
3. Frontend calls `generate-video` with `action: "check_eligibility"`.
   - **Eligible** → proceed to submit job (current flow).
   - **Not eligible** → frontend calls `director-agent` with `action: "rewrite_safe"` passing the original prompt + the rejection reason. Status updates to *"Prompt flagged — rewriting safely (attempt 1/2)…"*
4. Re-check the rewritten prompt.
   - **Eligible** → submit. Show a small toast: *"Prompt was lightly rewritten to pass content checks."* with a "View changes" link (diff dialog).
   - **Still not eligible after 2 rewrites** → stop. Surface the moderation reason in the dialog with a **Try again** / **Edit prompt manually** button. No job row is created.

## Backend changes

### `supabase/functions/generate-video/index.ts`
- Add a `SEEDANCE_ELIGIBILITY` map for the two providers:
  - `seedance-2.0` → `fal-ai/bytedance/seedance-2.0/check-eligibility`
  - `seedance-2.0-fast` → `fal-ai/bytedance/seedance-2.0/fast/check-eligibility`
- New action `check_eligibility` (POST):
  - Body: `{ provider, prompt }`. Validate same as submit (auth, length, known provider).
  - If provider is not in the map → return `{ eligible: true, skipped: true }` (so the frontend can call this uniformly without branching).
  - Otherwise POST to `https://queue.fal.run/<endpoint>` synchronously (these checks return fast). Normalize the fal response into:
    ```ts
    { eligible: boolean, reason?: string, categories?: string[], raw?: unknown }
    ```
  - On fal 5xx / network error → return `{ eligible: true, degraded: true, reason: "check_unavailable" }` so we fail-open and don't block the user when the moderation service is down. Log it.
- In the existing `submit` action, for Seedance 2.0 / 2.0 Fast, **re-run the eligibility check server-side** before hitting fal. This is a cheap defense so a client that skips the pre-check still can't bypass it. If not eligible, return `409 { error: "not_eligible", reason, categories }` and do **not** create a `video_jobs` row.

### `supabase/functions/director-agent/index.ts`
- Add a tool / action `rewrite_safe`:
  - Input: `{ original_prompt, rejection_reason, categories?, model_id }`.
  - System prompt addendum: *"The prompt was rejected by Seedance 2.0 content moderation for: {reason}. Rewrite the prompt to preserve cinematography, camera, lens, lighting, and composition, but remove or soften the flagged element. Do not add new subjects. Keep the Seedance shooting-script structure intact. Output the rewritten `mainPrompt` only."*
  - Returns `{ rewritten_prompt: string, changes_summary: string }`.

## Frontend changes

### `src/lib/director/api.ts`
- Add helpers:
  - `checkVideoEligibility(provider, prompt) → { eligible, reason?, categories?, degraded? }`
  - `rewritePromptSafe(sessionId, prompt, reason, categories?) → { rewritten_prompt, changes_summary }`

### `src/lib/director/videoModelControls.ts` (or catalog)
- Export `requiresEligibilityCheck(modelId): boolean` → true only for `seedance-2.0` and `seedance-2.0-fast`. Single source of truth used by both UI and any future analytics.

### `src/components/director/VideoOptionsDialog.tsx`
- Add a `phase` state: `"idle" | "checking" | "rewriting" | "blocked" | "submitting"`.
- When `requiresEligibilityCheck(model.id)` is true, on confirm:
  1. `phase = "checking"` → call `checkVideoEligibility`.
  2. If not eligible → `phase = "rewriting"`, call `rewritePromptSafe`, then re-check (max 2 rewrite attempts tracked in a `rewriteCount` ref).
  3. On success → call `onConfirm(options, finalPrompt, rewriteSummary?)`.
  4. On final failure → `phase = "blocked"`, show reason + categories with **Try again** / **Cancel**.
- Update the `Render` button to show a spinner + dynamic label per phase.
- Pass the (possibly rewritten) prompt up via the `onConfirm` signature change: `(options, finalPrompt, meta?: { rewritten: boolean; summary?: string })`.

### `src/components/director/PromptResultCard.tsx`
- Update the `onConfirm` handler to:
  - Use `finalPrompt` (rewritten or original) when calling `submitVideoJob`.
  - If `meta.rewritten`, show a toast + a small "Prompt was rewritten to pass content checks. View changes" inline link that opens a diff dialog (reuse existing `Dialog` primitives, simple before/after side-by-side).

## Non-goals
- No changes to other model families' submit flow.
- No new DB columns; rewrite metadata lives in the toast/dialog only. (We can persist later if useful.)
- No batching multiple prompts.

## Technical notes
- Fail-open on moderation service errors (so an outage doesn't break renders), but never fail-open on a clear `eligible: false`.
- Server-side re-check in `submit` is the security boundary; the client check is a UX optimization.
- Keep retries hard-capped at 2 to avoid a rewrite loop costing tokens.
- All eligibility responses logged via `console.log` in the edge function (no PII beyond the prompt the user already wrote).

## Open follow-ups (not in this plan)
- Apply the same pattern to Veo's safety filter once we confirm fal exposes a separate pre-check endpoint for it.
- Persist `rewrite_history` on the `video_jobs` row for analytics.
