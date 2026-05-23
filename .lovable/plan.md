## Goal

Stop manually monitoring whether Gemini Omni Flash is live on the Lovable AI Gateway. Run a scheduled probe, persist the result, and have the model picker reveal the entry automatically (with a toast for the user) the first time the probe succeeds — no code change required when it lands.

## How it works

```text
pg_cron (every 15 min)
  └─> calls edge function `check-model-availability`
        └─> probes Lovable AI Gateway for each tracked model id
              ├─ success  → upsert row { available: true, first_available_at }
              └─ failure  → upsert row { available: false, last_error }
                  table: public.model_availability  (Realtime ON)
                                                  │
                                  ┌───────────────┘
                                  ▼
       useModelAvailability() hook (Realtime subscription)
                                  ▼
       ModelPicker filters catalog entry `gemini-omni-flash`
       (gated: true) → shown only when row.available === true
                                  ▼
       Toast on first-seen + small "NEW" badge for 7 days
```

## Pieces

### 1. Database

Migration:

- `public.model_availability`
  - `model_id text primary key` (e.g. `google/gemini-omni-flash`)
  - `display_name text not null`
  - `available boolean not null default false`
  - `last_checked_at timestamptz`
  - `first_available_at timestamptz`
  - `last_error text`
- RLS: public `select` (anyone signed in can read availability flags); no public `insert/update/delete`. Edge function uses the service role.
- Add table to `supabase_realtime` publication so the hook gets push updates.
- Seed row: `('google/gemini-omni-flash', 'Gemini Omni Flash', false, …)`. Designed so adding more models in the future is just another seed row.

### 2. Edge function — `check-model-availability`

- `verify_jwt = false`, callable by cron and by an admin debug button.
- For each row in `model_availability`, send a minimal probe to `https://ai.gateway.lovable.dev/v1/chat/completions`:
  - body: `{ model, messages: [{role:"user",content:"ping"}], max_tokens: 1 }`
  - 200 / valid completion → mark `available = true`, set `first_available_at` if null.
  - 400/404 with "model not found" / "unsupported model" → `available = false`, store error.
  - 429 / 5xx → leave previous state untouched (transient), just bump `last_checked_at`.
- Always update `last_checked_at`. Uses service role key to write.
- Returns a JSON summary so the admin button can show what changed.

### 3. Scheduled run

Migration enables `pg_cron` + `pg_net` and schedules:

```sql
select cron.schedule(
  'check-model-availability',
  '*/15 * * * *',
  $$ select net.http_post(
       url := 'https://foaxkfpblyovbocvmtjj.supabase.co/functions/v1/check-model-availability',
       headers := jsonb_build_object('Content-Type','application/json'),
       body := '{}'::jsonb
     ); $$
);
```

### 4. Catalog entry (gated)

In `supabase/functions/_shared/videoModelCatalog.ts`, add a new entry for `gemini-omni-flash` with full capabilities metadata and a new optional field `gated?: { availabilityKey: string }`. The key matches the `model_id` row. All existing catalog entries leave `gated` undefined and behave unchanged.

### 5. Frontend hook + picker integration

- `src/hooks/useModelAvailability.ts` — fetches the table once on mount, subscribes to Realtime, returns `Record<modelId, { available, firstAvailableAt }>`. Caches in `localStorage` so the picker doesn't flicker on refresh.
- `src/components/ModelPicker.tsx` — before rendering catalog entries, filter out any entry with `gated` whose `availabilityKey` is not `available` in the hook's data. When `firstAvailableAt` is within 7 days, show a small "NEW" pill on the entry.
- One-time toast: when the hook transitions a tracked model from `false → true` in a live session, fire `toast.success("Gemini Omni Flash is now available — try it from the model picker.")`. Persist a "seen" flag in `localStorage` so the toast only fires once per user.

### 6. Admin affordance (small)

In the admin Analytics tab, add a one-row "Model availability" card listing tracked models, their flag, last check, and a "Check now" button that invokes the edge function. Read-only otherwise.

## Files touched

- `supabase/migrations/<ts>_model_availability.sql` — table, RLS, realtime publication, seed row, pg_cron schedule.
- `supabase/functions/check-model-availability/index.ts` — new probe function.
- `supabase/config.toml` — register the new function (verify_jwt = false).
- `supabase/functions/_shared/videoModelCatalog.ts` — add `gemini-omni-flash` entry + optional `gated` field on the type.
- `src/hooks/useModelAvailability.ts` — new hook with Realtime subscription.
- `src/components/ModelPicker.tsx` — filter gated entries, "NEW" pill, first-seen toast.
- `src/components/admin/AnalyticsTab.tsx` — small "Model availability" card with manual recheck button.

## Out of scope

- No changes to existing models, ranking logic, or generation pipeline.
- No quota / usage tracking — purely an availability flag.
- Not generalizing to every future model right now; the table makes it trivial to add rows later, but only `gemini-omni-flash` is seeded.

## Verification

- Run migration → seed row exists, RLS allows authenticated `select`, no public write.
- Manually invoke `check-model-availability` → row's `available` is `false` and `last_error` reflects the "model not found" response from the gateway.
- Temporarily seed a known-good model id (e.g. `google/gemini-3-flash-preview`) → re-run → row flips to `true`, `first_available_at` set. Remove the temp row afterward.
- In the picker, `gemini-omni-flash` is hidden today; flipping the row to `true` via the admin button makes it appear and triggers the toast.
- pg_cron entry visible via `select * from cron.job;`.
