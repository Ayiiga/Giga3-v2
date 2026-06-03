# Credits System Audit Report

**Date:** 2026-06-03  
**Deployment:** `perfect-lark-521` (`https://perfect-lark-521.convex.cloud`)

## Root cause

`FREE_STARTER_CREDITS` (25) was defined in `convex/subscriptionPlans.ts` but **never applied**. All user-creation paths set `credits: 0` and `starterCreditsGranted: false`, while `platformActions:sendMessage` deducts 1 credit per chat after a successful AI call. New signups could not send messages.

## Current credit rules

| Action | Cost (credits) | Modes / notes |
|--------|----------------|---------------|
| `chat` | 1 | general, coding |
| `writing` | 2 | homework, resume, book, social |
| `research` | 3 | research, university, waec, news |
| `image` | 2 | media studio |
| `video` | 8 | media studio |

- Deduction runs in `credits.performDeduct` via `deductForChatMode` / `deductCredits`.
- `local_fallback` provider responses are **not** charged (`platformActions.ts`).
- Balances are normalized with `normalizeCredits()` — never `undefined` or negative in storage.
- Subscription refills and Paystack purchases grant credits via `grantCreditsInternal`.

## Default credits for new users

| Field | Value |
|-------|--------|
| Starter grant | **25 credits** (`FREE_STARTER_CREDITS`) |
| `starterCreditsGranted` | `true` after grant |
| `creditLogs` entry | `action: "starter_grant"`, `reference: "onboarding"` |
| Legacy tokens | 12 (unchanged, used by legacy `askAI` path) |

Grant is **idempotent** — safe to call on every login via `credits.ensureStarterCredits` and inside `performDeduct`.

## Migration performed

**Function:** `credits:backfillStarterCredits` (internal mutation, runnable via CLI)

```bash
npx convex run credits:backfillStarterCredits '{"limit": 1000}'
```

**Production run (2026-06-03):**

| Metric | Count |
|--------|-------|
| Users scanned | 4 |
| Starter grants applied | 1 |
| Flags fixed (had credits, flag missing) | 1 |
| Balances normalized | 0 |

Existing zero-balance users without `starterCreditsGranted` received 25 credits. Users with a positive balance only had the flag set (no double grant).

## Development bypass

Set on the **Convex deployment** (not Next.js):

```bash
npx convex env set CREDITS_BYPASS_DEV true   # dev / smoke tests only
npx convex env unset CREDITS_BYPASS_DEV      # production
```

When `CREDITS_BYPASS_DEV=true`, deductions return `{ charged: 0, bypassed: true }` without reducing balance.

## Files changed

| File | Change |
|------|--------|
| `convex/creditsLogic.ts` | **New** — normalize, bypass, starter grant helper |
| `convex/credits.ts` | Starter grant in deduct path; `ensureStarterCredits`; `backfillStarterCredits`; clamp balances |
| `convex/users.ts` | Grant starter credits on create / returning login |
| `convex/platformActions.ts` | Call `ensureStarterCredits` before chat |
| `convex/ai.ts` | Starter grant on inline user create |
| `convex/payments.ts` | Starter grant on inline user create |
| `convex/schema.ts` | Optional OAuth/legacy user fields (required for prod deploy) |
| `docs/CREDITS_AUDIT_REPORT.md` | This report |

## Verification results

| Test | Result |
|------|--------|
| `users:createUser` new email | ✅ `credits: 25`, `starterCreditsGranted: true` |
| `credits:ensureStarterCredits` existing zero user | ✅ `balanceAfter: 25` |
| `credits:backfillStarterCredits` | ✅ 1 grant + 1 flag fix / 4 users |
| `credits:deductForChatMode` (general) | ✅ 25 → 24, `charged: 1` |
| Convex deploy to production | ✅ |
| Browser chat E2E | See PR walkthrough / screen recording |

## User creation paths audited

| Path | Starter grant |
|------|---------------|
| `users:createUser` | ✅ via `applyStarterGrantIfNeeded` |
| `platformActions:sendMessage` → createUser | ✅ |
| `aiActions:askAI` → createUser | ✅ |
| `ai.persistLegacyChat` inline insert | ✅ |
| `payments.grantPurchaseTokens` inline insert | ✅ |
