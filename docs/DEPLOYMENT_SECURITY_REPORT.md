# Deployment Security Report

**Branch:** `cursor/security-audit-fixes-4479`  
**Date:** 2026-06-28  
**Status:** Deployment-ready after Convex env configuration and CI deploy

## Executive summary

This pass completes session-token-only identity for all user-facing Convex APIs, adds Supabase magic-link → Giga3 session exchange, implements security event monitoring, tightens CSP where compatible with the static Next.js PWA export, and documents OWASP Top 10 / API Security Top 10 posture.

## Authentication model

| Path | Flow |
|------|------|
| **Convex (default)** | `authActions.establishSessionFromEmail` → HMAC-signed `giga3.v1.*` session token |
| **Supabase** | Magic-link OTP → `authActions.establishSessionFromSupabase` verifies JWT via Supabase REST → Giga3 session token |
| **All APIs** | `requireSession(sessionToken)` derives email server-side; client `userId`/`email` args removed |

### Session secret rotation

```bash
# 1. Set new secret as current; move old to PREVIOUS
npx convex env set SESSION_SIGNING_SECRET_PREVIOUS "<old-secret>"
npx convex env set SESSION_SIGNING_SECRET "<new-long-random-secret>"
npx convex env set SESSION_SIGNING_KEY_ID "2026-06"

# 2. Deploy backend
# 3. After all tokens re-issued (~30d TTL), remove PREVIOUS
npx convex env unset SESSION_SIGNING_SECRET_PREVIOUS
```

Required production env:

| Variable | Required | Purpose |
|----------|----------|---------|
| `SESSION_SIGNING_SECRET` | **Yes** | HMAC key for session tokens |
| `SESSION_SIGNING_SECRET_PREVIOUS` | No | Grace period during rotation |
| `SESSION_SIGNING_KEY_ID` | No | Token kid metadata |
| `SUPABASE_URL` | Supabase auth | Magic-link verification |
| `SUPABASE_ANON_KEY` | Supabase auth | Magic-link verification |
| `QUALITY_DASHBOARD_ADMIN_KEY` | Admin | Security dashboard query |

## Security monitoring

`securityEvents` table records:

- `auth_failure` — invalid/expired session tokens
- `auth_forbidden` — reserved for future use
- `upload_abuse` — quota violations
- `attachment_rejected` — server-side validation failures
- `rate_limit` — auth bootstrap / feedback limits
- `suspicious_activity` — extensible

Admin query: `securityMonitoring.getSecurityDashboard({ adminKey, hours })`

High-severity events log `[security.alert]` to Convex console (wire to PagerDuty/Slack via log drain).

## CSP hardening (`web/public/_headers`)

| Change | Rationale |
|--------|-----------|
| Replaced `unsafe-eval` with `wasm-unsafe-eval` | Reduces arbitrary JS eval; Mermaid/WASM still works |
| Added `frame-ancestors 'none'` | Clickjacking protection |
| Added `upgrade-insecure-requests` | TLS enforcement |
| Kept `unsafe-inline` for scripts/styles | Required for Next.js static export + Tailwind |

## OWASP Top 10 (2021) — findings

| ID | Risk | Status | Notes |
|----|------|--------|-------|
| A01 | Broken Access Control | **Fixed** | Session-only identity; IDOR on uploads/credits/conversations closed |
| A02 | Cryptographic Failures | **Mitigated** | HMAC-SHA256 sessions; Paystack HMAC webhook; TLS via hosting |
| A03 | Injection | **Mitigated** | Convex parameterized queries; attachment/Mermaid sanitization |
| A04 | Insecure Design | **Improved** | Server-side upload measurement; internal credit grants |
| A05 | Security Misconfiguration | **Improved** | CSP, security headers, removed public `grantCredits` |
| A06 | Vulnerable Components | **Monitor** | Run `npm audit` in CI; no critical overrides added |
| A07 | Auth Failures | **Improved** | Magic-link (Supabase); rate-limited bootstrap; session monitoring |
| A08 | Data Integrity | **Mitigated** | Paystack amount reconciliation; signed sessions |
| A09 | Logging Failures | **Improved** | `securityEvents` + console alerts |
| A10 | SSRF | **Low** | Media/chat providers use allowlisted URLs server-side |

## API Security Top 10 — findings

| ID | Risk | Status |
|----|------|--------|
| API1 | Broken object level auth | **Fixed** — session-derived userId on all BOLA endpoints |
| API2 | Broken auth | **Fixed** — no trusted client identity fields |
| API3 | Broken object property auth | **OK** — users only access own conversations/messages |
| API4 | Unrestricted resource consumption | **Mitigated** — upload quotas, rate limits, credit checks |
| API5 | Broken function level auth | **Fixed** — `grantPurchaseTokens` internal; admin keys on dashboards |
| API6 | Mass assignment | **OK** — explicit validators |
| API7 | SSRF | **Low** |
| API8 | Security misconfiguration | **Improved** |
| API9 | Improper inventory | **Documented** — this report |
| API10 | Unsafe API consumption | **OK** — clients pass sessionToken only |

## Automated tests

```bash
npm run test:security
```

Covers: session auth + rotation, attachment validation, Mermaid sanitization, OWASP checklist assertions.

## Manual verification checklist

- [ ] Sign in (Convex email + Supabase magic link) → session token in `localStorage`
- [ ] Chat send/regenerate with attachments → quota enforced
- [ ] Paystack checkout → `initializePayment` with session only
- [ ] Media studio image/video → credits deducted for authenticated user
- [ ] Invalid session token → 401 + `auth_failure` event in dashboard
- [ ] Hard-refresh PWA after deploy; bump `sw.js` cache name

## Residual risks (accepted)

| Risk | Severity | Mitigation path |
|------|----------|-----------------|
| Convex-path email login without mailbox proof | Medium | Enable Supabase magic-link in production (`NEXT_PUBLIC_GIGA3_DATA_BACKEND=supabase`) |
| CSP `unsafe-inline` scripts | Low | Migrate to nonce-based CSP when moving off static export |
| `quality` per-response metadata in chat | Low | Per-message only, not platform aggregates |

## Deployment steps

1. Set Convex env vars (see above)
2. Merge PR and run **Deploy Convex backend** GitHub Action
3. Build/deploy static PWA (`npm run build` → `web/out`)
4. Verify Paystack webhook still receives `charge.success`
5. Review `getSecurityDashboard` after 24h traffic
