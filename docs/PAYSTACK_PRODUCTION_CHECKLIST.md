# Paystack production checklist

Use this checklist before accepting real GHS payments on the Giga3 Hub production domain.

## Convex environment (production deployment)

| Variable | Required | Notes |
|----------|----------|--------|
| `PAYSTACK_SECRET_KEY` | **Yes** | Live key must start with `sk_live_`. Never expose it in frontend code or logs. |
| `FRONTEND_URL` | **Yes** | Must match the production site origin; used for Paystack callback URLs. |
| `PAYSTACK_REQUIRE_LIVE` | Recommended | Set to `true` to block checkout unless the configured secret is a live key. |
| `PAYSTACK_BASIC_GHS` / `PRO` / `PREMIUM` | Optional | Server-side overrides for subscription checkout and renewal prices. These must be reconciled with the public static price catalogue before enabling or changing them. |
| `PAYSTACK_CREDITS_*_GHS` | Optional | Server-side credit-pack price overrides; reconcile against the public catalogue before changing. |

**Price-change control:** public marketing prices are statically generated, while checkout and renewal amounts are resolved by Convex. Any environment override can therefore create a customer-visible mismatch unless the frontend catalogue, SEO offer data, and Convex configuration are updated and deployed together. Do not change live price overrides without a coordinated release and a test-mode checkout.

## Paystack Dashboard

1. Configure the webhook URL as `https://<deployment>.convex.site/paystack/webhook`.
2. Enable `charge.success` and `charge.failed`.
3. Confirm the dashboard mode matches the configured secret key.
4. Keep the webhook signing secret private; verify signature handling after any endpoint change.

## Checkout and fulfilment safeguards

- `initializePayment` requires a session token and resolves the user from the server-validated session.
- The server resolves the product and amount from its catalogue; clients do not choose the charge amount.
- Fulfilment validates the verified Paystack amount and currency before granting credits or activating a subscription.
- Duplicate successful fulfilment is guarded by the payment reference.
- Failed or underpaid transactions must not grant credits, subscriptions, marketplace downloads, or other paid value.
- Reconcile pending transactions through the supported verification/webhook flow; do not manually mark payments successful.

## Subscription renewal behaviour

- Subscription periods are 30 days.
- Automatic renewal is attempted only when a reusable saved authorization is available and the user has not disabled renewal.
- Mobile money payments generally cannot be charged using a reusable card authorization; those customers receive a reminder to renew manually from the wallet.
- Renewal attempts have retry limits. After repeated failures, the customer must renew manually.
- Users can turn off automatic renewal from the wallet. Confirm the control and resulting state before release.

## Safe verification

1. Check the client-safe `paystack:getPaystackStatus` result; never print or share secret values.
2. Use Paystack test credentials and a staging Convex deployment for successful, failed, cancelled, duplicate, wrong-amount, and wrong-currency scenarios.
3. Confirm the success callback and webhook cannot grant value twice.
4. Confirm failed and cancelled payments leave paid features locked and balances unchanged.
5. Confirm subscription renewal opt-out prevents subsequent automatic attempts.
6. Confirm mobile-money renewal reminders direct users to the wallet.
7. Use a small live transaction only as a separately approved production smoke test; never use it as an automated CI test.

## Release controls

- Run unit, integration, type-check, and production build workflows on the exact release commit.
- Verify public prices against effective Convex prices without exposing credentials.
- Do not deploy Convex billing changes or alter production environment variables without an approved change window and rollback plan.
- Record the tested environment, payment references (redacted where appropriate), results, and release commit.
