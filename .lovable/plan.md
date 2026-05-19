# Add Paddle payments → credit packs + subscriptions

## Why Paddle (not Stripe)
Stripe does **not** onboard sellers in Kuwait. Paddle is a Merchant of Record that supports Kuwait-based sellers, handles VAT/sales tax worldwide, pays out to a Kuwaiti bank account, and is well-suited to digital credits with a microtransaction-friendly fee structure (5% + $0.50 baseline).

## Proposed pricing (anchored on current per-credit cost)
Reference: a 6-second Veo 3 render = 240 credits, Kling v2 master 6s = 210 credits, Hailuo standard 6s = 48 credits. Director text reply = 1, multimodal = 3, reference image = 5.

### One-time credit packs
| Pack | Credits | Price (USD) | $/credit | Roughly buys |
|------|---------|-------------|----------|--------------|
| Mini | 500 | $9.99 | $0.020 | 2 Veo 3 shots or ~10 Hailuo shots |
| Starter | 1,500 | $24.99 | $0.017 | 6 Veo 3 shots + 100 chats + 30 images |
| Creator | 5,000 | $69.99 | $0.014 | A full storyboard (~20 Veo 3 shots) |
| Studio | 15,000 | $179.99 | $0.012 | Pro production run |

### Monthly subscriptions (auto-refill)
| Plan | Credits/mo | Price | Perks |
|------|------------|-------|-------|
| Indie | 1,000 | $14.99 | — |
| Pro | 3,000 | $39.99 | Priority queue |
| Studio | 8,000 | $99.99 | Priority queue + early model access |

Unused subscription credits roll over up to **2× monthly allotment**. Pack credits never expire. All prices editable in Paddle dashboard post-launch.

## What gets built

### 1. Enable Paddle
- Run `recommend_payment_provider` to validate VidoPrompt against Paddle's acceptable use policy
- Run `enable_paddle_payments` → sandbox is live immediately; you complete Kuwait business verification later to flip to production
- Create the 7 SKUs above via `batch_create_product`

### 2. Database (migration)
- New `subscriptions` table: `user_id, paddle_subscription_id, plan_key, status, current_period_end, monthly_credits, rollover_cap`
- New `paddle_events` idempotency table: `event_id PK, processed_at` — prevents double-crediting on webhook retries
- Extend `credit_topups`: add `paddle_transaction_id`, `paddle_subscription_id`, `sku_key`
- New ledger reasons: `pack_purchase`, `subscription_grant`, `subscription_renewal`, `refund_reversal`

### 3. Edge functions
- **`paddle-checkout`** (auth required) — body `{ sku_key }`, returns Paddle checkout URL with `custom_data: { user_id, sku_key }`
- **`paddle-webhook`** (`verify_jwt = false`, validates Paddle signature) handles:
  - `transaction.completed` → credit one-time pack via `grant_credits`
  - `subscription.activated` / `subscription.renewed` → grant monthly credits, apply rollover cap
  - `subscription.canceled` / `subscription.past_due` → flip status, keep existing balance
  - `transaction.refunded` → `refund_reversal` (clamped at 0)
  - Idempotent via `paddle_events` table

### 4. UI
On `/account/billing`:
- New **"Get more credits"** section above the existing Price List
- Two tabs: **Packs** (4 cards) and **Subscriptions** (3 cards), each with a **Buy** / **Subscribe** button opening Paddle Checkout overlay (`@paddle/paddle-js`)
- **Active subscription card** showing plan, renewal date, "Manage" (Paddle customer portal), "Cancel"
- Purchase history rendered alongside the existing ledger
- Update `insufficient.ts` so the toast's **View billing** action deep-links to `?tab=packs`

### 5. Secrets
After `enable_paddle_payments` completes, these are auto-injected:
- `PADDLE_API_KEY` (server)
- `PADDLE_NOTIFICATION_SECRET` (server, for webhook signature verification)
- `PADDLE_ENVIRONMENT` (`sandbox` / `live`)
- `VITE_PADDLE_CLIENT_TOKEN` (browser, non-secret)

## Files to create / edit
```text
NEW  supabase/migrations/<ts>_paddle_subscriptions.sql
NEW  supabase/functions/paddle-checkout/index.ts
NEW  supabase/functions/paddle-webhook/index.ts
NEW  src/lib/paddle/client.ts            (Paddle.js initializer)
NEW  src/lib/paddle/catalog.ts           (packs + plans, single source of truth)
NEW  src/components/billing/PacksTab.tsx
NEW  src/components/billing/SubscriptionsTab.tsx
NEW  src/components/billing/ActiveSubscriptionCard.tsx
NEW  src/hooks/useSubscription.ts
EDIT src/pages/account/AccountBilling.tsx
EDIT src/lib/credits/insufficient.ts     (deep-link to /account/billing?tab=packs)
```

## Items I'll confirm with you after approval
1. **Pricing sign-off** — keep the 4 packs / 3 plans above as proposed, or adjust
2. **Trial?** — should Indie / Pro offer a 7-day free trial, or charge immediately
3. **Kuwait verification** — Paddle will need your commercial registration + bank details to switch from sandbox to live; you can keep building in sandbox while that's pending
