# Giga3 — Google Play billing policy review (engineering notes)

**Status:** Billing strategy requires final Google Play policy verification before production publication.

This document maps how Giga3 sells digital goods today. It does **not** claim Play Store compliance.

## Summary

Giga3 sells **digital subscriptions** and **digital credit packs** (consumable in-app currency for AI chat, media, and related features) through **Paystack** (GHS). Checkout is initiated in the web/PWA UI; payment authorization runs on **Convex** server actions. **Google Play Billing is not implemented** in this repository phase.

Paystack was **not modified** for the Android TWA work.

### Phase 4 read-only verification (release prep)

| Check | Result |
|-------|--------|
| Android `launchUrl` / host | `https://www.giga3ai.com/` (`android/app/build.gradle`, `twa-manifest.json`) |
| Paystack references under `android/` | **None** — TWA has no payment SDK |
| Google Play Billing in TWA manifest | **Disabled** (`playBilling.enabled: false`) |
| `web/**` or `convex/**` modified for Android | **No** |
| Paystack checkout path | Unchanged website flow via loaded PWA |

---

## Digital goods and services sold

| Product type | Examples | Delivery |
|--------------|----------|----------|
| Monthly subscriptions | Basic / Pro / Premium (`sub_*_monthly`) | Credits refilled each billing period; feature access |
| One-time credit packs | `credits_5`, `credits_10`, … `credits_500` | Credits added to wallet |
| Usage | Chat, writing, research, image, video | Credits deducted per action |

Catalog mirrors (UI): `web/lib/payments/subscriptionCatalog.ts`, `web/lib/payments/creditPacksCatalog.ts`  
Server: Convex `paystack.ts`, `subscriptionPlans`, `creditPacks`

All of the above are **digital goods/services** consumed inside Giga3.

---

## Payment flow (unchanged)

1. User opens `/subscribe`, `/credits`, `/wallet`, or in-app billing modals (e.g. `CreditsPaystackModal`, `useBilling`).
2. Client calls Convex action `paystack.initializePayment` with `sessionToken` + `productId`.
3. Convex creates Paystack transaction; returns authorization URL or inline checkout parameters.
4. Client opens Paystack Inline JS (`@paystack/inline-js`) or redirects to Paystack hosted checkout (`js.paystack.co` allowed in CSP).
5. On success, client verifies via `paystack.verifyPayment` / success page `/payment/success/`.
6. Convex webhook (`perfect-lark-521.convex.site/paystack/webhook`) fulfills payment server-side.

**Secrets:** `PAYSTACK_SECRET_KEY` on Convex only. Public key may be inlined at build (`NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`) or fetched via `paystack.getClientConfig`.

---

## How Android TWA reaches payments

The TWA loads **https://www.giga3ai.com/** — the same static export and billing UI as the PWA. No separate Android payment SDK. Users who tap Subscribe/Credits in the app use the **same Paystack web checkout** inside Chrome Custom Tabs / Trusted Web Activity.

Relevant routes: `/wallet/`, `/subscribe/`, `/credits/`, `/payment/success/`, `/payment/failed/`

---

## Google Play policy questions (legal/product — not resolved here)

1. **Play Billing requirement:** Google Play policies generally require **Google Play Billing** for in-app purchases of digital goods consumed in the app. Paystack-only checkout inside a Play-distributed TWA may require:
   - Play Billing integration for in-app digital purchases, **or**
   - A permitted exception (jurisdiction-specific programs, external offers policy, etc.), **or**
   - Distribution model change (e.g. app as companion with purchases only on web — **must be verified with counsel and current Play policy**).

2. **Subscriptions:** Auto-renewing GHS subscriptions via Paystack may need parallel Play subscription products if sold inside the Play-listed app.

3. **Geography:** Giga3 targets Ghana (GHS). Confirm whether User Choice Billing or external payment rules apply in target countries.

4. **Disclosure:** Store listing and in-app copy must accurately describe payment processor and renewal terms (already partially covered in `/legal/terms/` and `/legal/privacy/`).

---

## Engineering vs policy decisions

| Item | Owner |
|------|--------|
| Whether to add Google Play Billing | Product + legal |
| Whether to restrict purchases in Play build | Product + legal |
| Paystack implementation | **No change in TWA phase** |
| TWA shell (loads production web) | Engineering — **done** |

---

## Recommended next steps (after internal testing)

1. Legal/product review of Play **Payments policy** and **Subscriptions** policy against Paystack-only flow.
2. Decide: implement Play Billing, limit Play app to free tier + web upgrade, or adjust store positioning.
3. Do **not** claim “Play compliant” until the above is resolved and tested on a Play internal track.

---

## Protected system notice

The existing Paystack/payment architecture is a protected production system. Do not remove, replace, disable, or modify it without explicit approval. Any Android-specific billing solution must be implemented separately and must not break Paystack on the website/PWA.
