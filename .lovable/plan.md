## In-app credits for MovPrompt

A wallet + ledger that charges users credits when they use **AI Director** (chat + final video) and **Ads / Marketing Studio** (ad scene + image + video). Costs scale with the real upstream price (Lovable AI tokens + FAL video model + duration).

### 1. Credit unit & pricing formula

1 credit = $0.01 of upstream cost (×1.5 margin). All conversions live in one server-side table so we can tune without redeploys.

**Cost categories**

| Action | Charged when | Base cost |
|---|---|---|
| Director chat turn (text only) | Each assistant reply | 1 credit |
| Director chat turn (with image/PDF/video analysis) | Each multimodal reply | 3 credits |
| Image generation (reference frame, ad still) | On success | 5 credits |
| Video generation | On submit, refund on fail | `ceil(model_rate_per_sec × duration × 150)` |
| Ad scene write (text) | On success | 2 credits |

**Per-model video rates** (credits per second, derived from FAL public pricing × 1.5):

```text
veo-3.1            45   veo-3.1-fast        20   veo-3.1-lite       10
veo-3 / veo-3-fast 40/18  veo-2             12
kling-v3-pro       30   kling-v3-standard   12   kling-v3-4k        60
kling-omni*        50   kling-v2.5-turbo-pro 25  kling-v2.1-master  35
seedance-v1-pro    15   seedance-v1-lite     6
hailuo-02-pro      18   hailuo-02-standard   8
runway-gen3-turbo  20   wan-pro              22   ltx-video         5
```

Final number = `ceil(rate × duration_seconds)`. Stored in `credit_prices` table — admin editable.

### 2. Wallet model

```text
┌─ user_credits ─────────┐   ┌─ credit_ledger ─────────────────┐
│ user_id PK             │   │ id, user_id, delta (+/-),       │
│ balance int            │←──│ reason (signup_bonus, topup,    │
│ lifetime_granted int   │   │ director_chat, video_render…), │
│ lifetime_spent int     │   │ ref_id (session/job),           │
│ updated_at             │   │ metadata jsonb, created_at      │
└────────────────────────┘   └─────────────────────────────────┘
```

- Balance is the source of truth; ledger is append-only audit trail.
- `user_credits` row auto-created via the existing `handle_new_user` trigger with a **signup bonus = 50 credits**.
- RLS: users can `SELECT` their own row + ledger; only `service_role` can write (charges happen in edge functions).

### 3. Charging flow

All charges go through one Postgres RPC `public.charge_credits(_user_id, _amount, _reason, _ref_id, _metadata)`:

1. `SELECT ... FOR UPDATE` on `user_credits`.
2. If `balance < amount` → raise `insufficient_credits` (edge function returns 402).
3. Decrement balance, insert ledger row, return new balance.

Refund RPC `public.refund_credits(...)` for failed video jobs (called from the `generate-video` poller when FAL returns error).

**Where it's called**

- `director-agent` → before each Lovable AI call, charge 1 or 3 credits depending on whether attachments are present.
- `generate-video` (submit branch) → look up `credit_prices[provider]`, compute `rate × duration`, charge before calling `fal.queue.submit`.
- `generate-video` (poll branch) on terminal failure → refund.
- `generate-reference-image`, `generate-preset-preview` (when triggered by Ads flow) → charge 5.
- `write-ad-scene` → charge 2.

### 4. UI

- **Top nav**: small pill showing `◆ 142` (balance) → click opens wallet drawer with ledger history.
- **Director composer**: subtle "≈ 18 credits" hint next to Send when a video model is selected, recalculated on model/duration change.
- **Marketing Studio render button**: same hint.
- **Insufficient balance**: edge function returns 402 → frontend shows toast "Out of credits" with CTA to `/account/billing`.
- **Account → Billing page**: balance card, ledger table (last 50), "Get more credits" button (stub for now — opens a "Top-ups coming soon" sheet, or links to existing Stripe/Paddle if enabled).

### 5. Free tier & top-ups (scope of this plan)

- Signup bonus: 50 credits (one-time, via trigger).
- Daily free refill: +10 credits/day capped at 30 (cron via Postgres function called from a scheduled edge function, or lazily on balance read — lazy is simpler, included here).
- Paid top-ups: **out of scope** for this plan — leaves a clean `credit_topups` table + stub UI so Stripe/Paddle can be wired later.

### 6. Files to touch

**New / migration**
- `supabase/migrations/*` — `user_credits`, `credit_ledger`, `credit_prices`, `credit_topups` tables; RPCs `charge_credits`, `refund_credits`, `grant_daily_credits`; seed `credit_prices`; extend `handle_new_user` to seed wallet + signup bonus.

**Edge functions (modify)**
- `supabase/functions/director-agent/index.ts` — charge per turn.
- `supabase/functions/generate-video/index.ts` — charge on submit, refund on fail.
- `supabase/functions/generate-reference-image/index.ts` — charge 5.
- `supabase/functions/write-ad-scene/index.ts` — charge 2.

**Frontend (new)**
- `src/hooks/useCredits.ts` — balance + realtime subscription.
- `src/lib/credits/pricing.ts` — mirrors `credit_prices` for UI estimates.
- `src/components/credits/CreditBadge.tsx` — nav pill.
- `src/components/credits/WalletDrawer.tsx` — balance + ledger.
- `src/components/credits/InsufficientCreditsDialog.tsx`.

**Frontend (modify)**
- `src/components/TopNav.tsx` — mount `CreditBadge`.
- `src/components/director/Composer.tsx` — cost hint + 402 handling.
- `src/pages/MarketingStudio.tsx` — cost hint + 402 handling.
- `src/pages/account/AccountBilling.tsx` — wallet + ledger UI.

### 7. Out of scope

- Real top-up checkout (Stripe/Paddle) — leaves clean seams.
- Per-org / team-shared wallets.
- Credit gifting / referral bonuses (already partially modeled in `referrals` — can be added later by inserting ledger rows).
- Retroactive charging for usage before this ships.
