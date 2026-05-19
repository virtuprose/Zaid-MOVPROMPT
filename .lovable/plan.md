# Tap Payments Integration (Kuwait) — Full Spec

Bring-your-own-merchant integration with **Tap Payments** covering: fixed credit packs, custom-amount top-ups, monthly subscriptions (invoice-link), and opt-in auto top-up via card-on-file.

Supports KNET, Visa/Mastercard, Apple Pay; settles in KWD.

## Prerequisites (you, outside Lovable)

1. Create a Tap merchant account at `tap.company` with your Kuwait commercial registration.
2. In Tap dashboard, generate:
   - **Secret API Key** — `sk_test_...` for sandbox, `sk_live_...` for production
   - **Webhook Secret** — for signature verification
3. After you have the test keys, I'll prompt you for `TAP_SECRET_KEY` and `TAP_WEBHOOK_SECRET` via the secrets tool.

Sandbox first; flipping live = swap the secret value.

## Pricing (USD; Tap converts to KWD at checkout)

**Fixed packs** — credits never expire
| Pack | Credits | Price | $/credit |
|---|---|---|---|
| Mini | 500 | $9.99 | $0.020 |
| Starter | 1,500 | $24.99 | $0.017 |
| Creator | 5,000 | $69.99 | $0.014 |
| Studio | 15,000 | $179.99 | $0.012 |

**Custom top-up** — slider, 200–25,000 credits, flat **$0.018/credit**, $5 minimum.

**Monthly plans** — invoice link emailed each cycle
| Plan | Credits/mo | Price |
|---|---|---|
| Indie | 1,000 | $14.99 |
| Pro | 3,000 | $39.99 |
| Studio | 8,000 | $99.99 |

Plan credits roll over up to 2× monthly allotment.

**Auto top-up** — opt-in setting: "When balance < X, auto-buy Y credits." Reuses pack pricing. Requires saved card (Tap tokenization). First setup runs a $0 verify + tokenize charge; later top-ups are silent re-charges using the stored token.

## Architecture

```text
One-time pack / custom top-up        Subscription cycle           Auto top-up trigger
        │                                  │                              │
        ▼                                  ▼                              ▼
[tap-checkout]                     [tap-renewal-cron]           [tap-autotopup-worker]
  Tap Charge API                    Tap Invoice API             Tap Charge w/ saved token
        │                                  │                              │
        ▼                                  ▼                              │
   Hosted URL                       Hosted invoice URL                    │
        │                                  │ emailed to user              │
        └───────────► [tap-webhook] ◄──────┴──────────────────────────────┘
                            │
                            ▼
                  verify HMAC, idempotency
                            │
                            ▼
                  grant_credits() RPC
```

## Database

New tables:

- **`subscriptions`** — `id, user_id, plan_key, status (active|past_due|canceled), credits_per_month, current_period_end, last_invoice_id, canceled_at, created_at`
- **`tap_events`** — `event_id PK, type, payload jsonb, processed_at` (idempotency guard)
- **`tap_invoices`** — `id, user_id, subscription_id, tap_invoice_id, amount_cents, status, hosted_url, due_at, paid_at`
- **`tap_payment_methods`** — `id, user_id, tap_card_token, brand, last4, exp_month, exp_year, is_default, created_at` (for auto top-up)
- **`auto_topup_settings`** — `user_id PK, enabled, threshold_credits, pack_key, payment_method_id, last_triggered_at, cooldown_minutes (default 60)`

Extend existing **`credit_topups`**: add `pack_key text NULL`, `kind text` (`pack`|`custom`|`auto`). `provider` will store `'tap'`.

New ledger reasons: `pack_purchase`, `custom_topup`, `auto_topup`, `subscription_grant`, `subscription_rollover_trim`.

RLS: users read/write only their own rows; `tap_events`, `tap_invoices` write-only via service role.

## Edge functions

1. **`tap-checkout`** (JWT) — body: `{ kind: 'pack'|'custom'|'subscription', key?, credits? }`. Creates Tap Charge (pack/custom) or first Invoice (subscription). Returns hosted URL. Stores pending row.
2. **`tap-save-card`** (JWT) — creates a $0/$1 verify charge with `save_card: true`; on webhook success, stores token in `tap_payment_methods`.
3. **`tap-webhook`** (public, signature-verified) — handles `charge.succeeded|failed`, `invoice.paid|cancelled`, `card.saved`. Idempotent via `tap_events`. Grants credits, updates topup/sub rows.
4. **`tap-renewal-cron`** (scheduled, daily) — for each `active` sub with `current_period_end < now() + 3 days`, create next Tap invoice and email user the link via existing Resend pipeline. Mark `past_due` if unpaid >7 days after due.
5. **`tap-autotopup-worker`** (called from `charge_credits` trigger or short cron) — when a user's balance drops below their threshold and cooldown is clear, charge their saved card silently.
6. **`tap-cancel-subscription`** (JWT) — set `canceled_at`; status stays `active` until period end.
7. **`tap-remove-card`** (JWT) — detach token + delete row.

All return CORS headers; `tap-webhook` is the only one with `verify_jwt = false`.

## Frontend

`/account/billing` gets a "Get more credits" section with three tabs:

- **Packs** — 4 cards + a **"Custom amount"** card with slider (200–25,000) and live price (`credits × $0.018`).
- **Plans** — 3 subscription cards.
- **Auto top-up** — toggle, threshold input, pack picker, saved-card selector, "Add card" button.

Plus:
- **Active subscription card** — plan, next renewal, manage/cancel.
- **Saved cards list** — brand/last4, default toggle, remove.
- **Purchase history** — unified feed of `credit_topups` + `tap_invoices`.
- **Return pages** — `/billing/success` (polls wallet for delta), `/billing/cancel`.
- **Insufficient-credits modal** — already wired; deep-link target updates to `/account/billing?tab=packs`.

## Files

**New**
- `supabase/migrations/<ts>_tap_payments.sql`
- `supabase/functions/tap-checkout/index.ts`
- `supabase/functions/tap-save-card/index.ts`
- `supabase/functions/tap-webhook/index.ts`
- `supabase/functions/tap-renewal-cron/index.ts`
- `supabase/functions/tap-autotopup-worker/index.ts`
- `supabase/functions/tap-cancel-subscription/index.ts`
- `supabase/functions/tap-remove-card/index.ts`
- `src/lib/tap/catalog.ts` — single source of truth for packs/plans/custom rate
- `src/components/billing/PacksTab.tsx`
- `src/components/billing/CustomTopupCard.tsx`
- `src/components/billing/PlansTab.tsx`
- `src/components/billing/AutoTopupTab.tsx`
- `src/components/billing/ActiveSubscriptionCard.tsx`
- `src/components/billing/SavedCardsList.tsx`
- `src/hooks/useSubscription.ts`
- `src/hooks/usePaymentMethods.ts`
- `src/pages/billing/BillingSuccess.tsx`
- `src/pages/billing/BillingCancel.tsx`

**Edited**
- `src/pages/account/AccountBilling.tsx` — mount tabs + sub card + saved cards
- `src/lib/credits/insufficient.ts` — deep-link target
- `src/App.tsx` — add `/billing/success` and `/billing/cancel` routes
- `supabase/config.toml` — `verify_jwt = false` for `tap-webhook` only

## Final open items

1. **Trial?** Recommend **no trial** — invoice-link flow already adds friction; trial would complicate first-cycle credit grant.
2. **Currency display:** Recommend **USD on cards**, KWD shown at Tap checkout (Tap converts automatically).
3. Once you confirm, I'll request `TAP_SECRET_KEY` + `TAP_WEBHOOK_SECRET`, run the migration, and ship functions + UI together.
