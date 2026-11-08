# GigaSocial Creator Earnings — Phase 0 audit & research

Access date for all URLs below: **2026-10-24** (Africa/Accra).

## Architecture map (source of truth)

| Concern | Source of truth | Notes |
| --- | --- | --- |
| Fan / follower count | `socialFollows` via `getFanCount` in `convex/gigaSocialEconomy.ts` | Same index as profile `fanCount` |
| Monetisation unlock | `economyJson` consent + fan threshold in `gigaSocialEconomy` / `gigaSocialMonetizationConsent` | Client cannot grant unlock |
| Tip / gift cash (Paystack) | `payments` + `socialCreatorGifts.paymentReference` | Idempotent fulfill |
| Credit tips | `socialCreatorGifts` + `creditLogs` | Not bank cash |
| Marketplace creator cash | `creatorProfiles.payoutBalanceGhs` / `totalEarningsGhs` + `marketplacePurchases` | Credited on purchase fulfill |
| Withdrawal requests | `creatorPayouts` | Status pending/processing/paid/failed — **no Paystack Transfer API wired** |
| Boost spend | `socialPostBoosts` + Paystack | Creator expense, not earnings |
| Affiliate | `socialAffiliateEvents` | Open to everyone |
| Content “view reward” rates | `remoteConfigEntries` / defaults in economy settings | **Unfunded estimate only — not withdrawable** |
| Badges / levels | `socialProfiles.gamificationJson` | Non-cash |
| Sessions | `requireSession(token, ctx)` | Money-touching mutations must pass `ctx` |
| Nav entry | GigaSocial `?tab=creator` | Earnings Centre is a creator sub-tab |

### Do not duplicate

- Do not create a second wallet balance — reuse `creatorProfiles.payoutBalanceGhs`.
- Do not invent a second fan counter — reuse `socialFollows`.
- Do not reimplement Paystack checkout — extend `convex/paystack.ts` when Transfers are ready.
- Do not treat estimated content bonuses as available cash.

### Threshold conflict (resolved for this initiative)

- Historical product brief (2026-10-24): proposed a **500-fan** monetisation unlock; this was superseded by the definitive global policy approved on 2026-11-08.
- Current policy: **`MIN_FANS_FOR_MONETIZATION = 15`** genuine fans globally, with **`MIN_FANS_FOR_WITHDRAWAL = 50`** genuine fans as a separate withdrawal safeguard.
- The server enforces the 15-fan eligibility threshold regardless of legacy remote configuration. Consent, good standing, application review, balance and payment checks remain required.
- **Money gate today:** withdrawals require current-policy consent + withdrawal fan check + balance (not application `approved`). Application/appeal is the review queue UI; admin approve tooling is not yet wired into `assertWithdrawalEligibility`. Documented intentional until Stage D/E.
- **Convex deploy required** before production use: new table `socialMonetizationApplications` and optional field `socialCreatorGifts.creditedToPayoutAt`.

## Official research notes

### YouTube Partner Program

- URL: https://support.google.com/youtube/answer/72851?hl=en  
- Finding: Full ads/Premium path historically ~1,000 subscribers + qualified watch hours or Shorts views; policy review after thresholds; fan-funding features can unlock earlier (~500 subs tier on creator pages).  
- Implication: Use multi-signal eligibility (fans + standing + consent + review), not fans alone; never promise typical income.

### TikTok Creator Rewards

- URL: https://www.tiktok.com/legal/page/global/tiktok-creator-rewards-program-eea/en  
- Finding: Authentic followers/views, original longer-form content, policy standing, dynamic rewards, appeals.  
- Implication: Reward originality and qualified engagement; exclude self-views / artificial inflation in future qualified-view design.

### Meta / Facebook creator monetisation

- URL: https://www.facebook.com/business/help/1049081556813520  
- Finding: In-stream ads / related programs wound down; Content Monetization invite-only; partner + content policies required.  
- Implication: Do not ship “ad revenue share” UI until Giga3 has real ad inventory and an approved allocation policy.

### Paystack Ghana Transfers

- URLs: https://paystack.com/docs/transfers/ ; https://paystack.com/docs/transfers/creating-transfer-recipients/ ; https://paystack.com/docs/transfers/single-transfers/  
- Finding: Ghana supports `ghipss` (bank) and `mobile_money` recipients; amounts in pesewas; require recipient create + transfer initiate + `transfer.success` / `failed` / `reversed` webhooks. Collection (charge) ≠ disbursement (transfer).  
- Implication: Keep payouts as **request + admin/ops review** until Transfer feature is activated on the live Paystack business and e2e verified. Never mark paid without provider confirmation.

### Ghana data protection / e-commerce

- URLs: https://ghalii.org/akn/gh/act/2012/843/eng@2012-05-18/publication (Data Protection Act, 2012 Act 843); https://dataprotection.org.gh/ (DPC); private-sector online business FAQ notes on licensed payment providers.  
- Finding: Controllers processing personal data should register with the DPC; notify purpose; secure processing; use authorised payment providers for electronic payments.  
- Implication / **needs professional review**: KYC docs, tax withholding on creator payouts, business registration, and consumer-facing disclosures before automated real-money disbursement launches.

## Commercial feasibility (assumption vs fact)

| Item | Status |
| --- | --- |
| Tip collection via Paystack | **Fact** — implemented |
| Marketplace fee → creator balance | **Fact** — implemented |
| Platform ad pool → creator share | **Missing** — Coming soon |
| Funded cash reward budgets | **Missing** — catalogue only until budget approved |
| Automated MoMo/bank Transfers | **Missing** — Paystack Transfer not wired |
| GH₵100,000/year aspiration | **Aspiration only** — planner math, never a guarantee |

## Implementation plan (stages)

1. **Historical (superseded)** — The original 500-fan gate was replaced by the global 15-fan eligibility policy; the 50-fan withdrawal safeguard remains.  
2. **C** — Application status model; goal planner; non-cash rewards/awards catalogue; guide + notifications hooks.  
3. **D/E** — Transfer payouts, admin finance dashboard with real ledger, fraud tooling — blocked on provider/business readiness (documented, not faked).
