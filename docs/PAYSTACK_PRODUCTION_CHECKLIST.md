# Paystack production checklist

Use this before accepting real GHS payments on **www.giga3ai.com**.

## Convex environment (production deployment)

| Variable | Required | Notes |
|----------|----------|--------|
| `PAYSTACK_SECRET_KEY` | **Yes** | Live key must start with `sk_live_`. Test keys (`sk_test_`) never charge real money. |
| `FRONTEND_URL` | **Yes** | e.g. `https://www.giga3ai.com` — used for Paystack `callback_url`. |
| `PAYSTACK_REQUIRE_LIVE` | Optional | Set to `true` to **block** checkout if the secret is not `sk_live_`. |
| `PAYSTACK_BASIC_GHS` / `PRO` / `PREMIUM` | Optional | Overrides subscription prices (see `convex/subscriptionPlans.ts`). |
| `PAYSTACK_CREDITS_*_GHS` | Optional | Credit pack prices. |

## Paystack Dashboard

1. **Webhook URL:** `https://<deployment>.convex.site/paystack/webhook`  
   Example: `https://perfect-lark-521.convex.site/paystack/webhook`
2. Enable events: **`charge.success`**, **`charge.failed`** (recommended).
3. Confirm **live** mode in dashboard when using `sk_live_…`.

## Deploy

```bash
npx convex deploy --yes   # requires CONVEX_DEPLOY_KEY
```

## Verification

1. Query `paystack:getPaystackStatus` — `liveReady` should be `true` when using `sk_live_…`.
2. Complete a **small live** test purchase (or test key on staging).
3. Confirm `/payment/success/?reference=…` activates credits/subscription.
4. If the browser verify fails, webhook or `paystack:reconcilePayment` should still fulfill pending rows.

## Warnings (do not skip)

- **No auto-renewal:** Subscriptions are one-time GHS charges + 30-day Convex period; users must pay again to renew.
- **Public actions:** `initializePayment` / `verifyPayment` trust `userId` from the client — protect with auth hardening in a future release.
- **Price display:** `web/lib/payments/plans.ts` amounts must match Convex env or users see wrong prices.
- **Test key on production URL:** Logs a warning; set `PAYSTACK_REQUIRE_LIVE=true` to enforce live keys.

## Not configured in this repo

- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is unused (redirect checkout only).
- Legacy `frontend/` still documents Stripe, not Paystack.
