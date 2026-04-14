

## Anonymous Analytics Tracking

### What
Track page visits and prompt generations without any authentication, using two database tables and a simple admin dashboard page to view reports.

### Database Tables

**`page_visits`**
- `id` (uuid, PK)
- `visited_at` (timestamptz, default now())
- `page_path` (text) — e.g. `/`
- `user_agent` (text, nullable)
- `session_id` (text) — random UUID stored in localStorage to approximate unique visitors

**`generation_events`**
- `id` (uuid, PK)
- `created_at` (timestamptz, default now())
- `session_id` (text)
- `workflow_type` (text) — single / twoframe / multishot
- `target_model` (text) — runway, kling, etc.

Both tables get RLS policies allowing anonymous inserts (no auth required) and a read policy restricted to a secret admin route.

### Frontend Tracking

**Page visit** — In `Index.tsx`, on mount, generate or retrieve a `session_id` from localStorage, then insert into `page_visits` via Supabase client.

**Generation event** — In `WorkflowPanel.tsx`, after a successful generation, insert into `generation_events` with workflow type and model.

### Admin Reports Page

**Route**: `/admin/analytics` (unlisted, accessed by URL only)

**Dashboard showing**:
- Total visits (today / 7d / 30d / all-time)
- Unique sessions (approximate unique visitors)
- Total generations by period
- Generations breakdown by workflow type (pie/bar chart)
- Generations breakdown by target model
- Daily trend line chart (visits + generations over last 30 days)

Uses Recharts (already available via the chart UI components) for visualizations.

### Files Changed
1. **Migration** — Create `page_visits` and `generation_events` tables with anonymous insert RLS
2. **`src/lib/analytics.ts`** — Helper functions: `trackPageVisit()`, `trackGeneration(workflowType, model)`, `getSessionId()`
3. **`src/pages/Index.tsx`** — Call `trackPageVisit()` on mount
4. **`src/components/WorkflowPanel.tsx`** — Call `trackGeneration()` after successful generation
5. **`src/pages/Analytics.tsx`** — New admin dashboard page with charts
6. **`src/App.tsx`** — Add `/admin/analytics` route

