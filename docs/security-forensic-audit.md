# Giga3 AI — Security Forensic Audit (Read-Only)

**Date:** 2026-10-01  
**Scope:** Repository source, production HTTP headers, Convex public queries, dependency manifests  
**Rule:** No application code modified for security findings in this audit.

---

## 1. Executive Summary

Security review found **no confirmed exposed production secrets** in tracked files. Authentication and payment verification patterns align with documented invariants. Production serves strong transport and framing protections. **Primary actionable item:** npm dependency vulnerabilities in dev/build tooling (22 total across root + web) — remediate in a dedicated upgrade PR, not this audit.

---

## 2. Secrets Exposure

### Repository scan

| Pattern | Result |
|---------|--------|
| `sk_live_*`, `sk_test_*` (live values) | **Not found** in source (test fixture strings only) |
| `re_*` (Resend keys) | **Not found** |
| `AIzaSy*` (Google API keys) | **Not found** |
| `ghp_*` (GitHub tokens) | **Not found** |
| Private keys (`BEGIN PRIVATE`) | **Not found** in app code |

### Git history (sample)

`git log -S "sk_live_"` — hits limited to documentation examples and redacted test files. **No confirmed historical secret leak** in sampled history.

### Client bundle policy

`tests/security/clientAuthSecrets.test.ts` asserts auth-related client files do not reference `PAYSTACK_SECRET_KEY`, `SESSION_SIGNING_SECRET`, `RESEND_API_KEY`, or `sk_live_`. **VERIFIED OK**

### Environment separation

| Secret | Expected location | Client exposure |
|--------|-------------------|-----------------|
| `PAYSTACK_SECRET_KEY` | Convex only | None |
| `OPENAI_API_KEY` | Convex only | None |
| `SESSION_SIGNING_SECRET` | Convex only | None |
| `NEXT_PUBLIC_CONVEX_URL` | Build-time public | Intentional |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Build-time public | Intentional (Paystack public key) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Build-time public | Intentional |

**Classification:** VERIFIED OK (no confirmed secret exposure)

---

## 3. Authentication & Authorization

### Session minting (static enforcement)

`tests/security/owaspChecklist.test.ts` verifies:

- `users:createUser` does not mint sessions
- `establishSessionFromEmail` / `setPasswordForEmail` are disabled stubs
- Sessions only via password verify, Google ID token, Supabase JWT, or valid refresh
- `requireSession(token, ctx)` used on payment and identity paths

**Classification:** VERIFIED OK

### Protected routes

- Account pages (`/chat/`, `/wallet/`, `/credits/`, etc.) marked `noindex` and `Cache-Control: no-store` in `web/public/_headers`
- Service worker excludes private document prefixes from cache storage (`web/public/sw.js`)
- Robots.txt disallows crawl of account paths (crawl hint, not auth boundary)

**Classification:** VERIFIED OK (defense in depth; auth enforced server-side on Convex)

---

## 4. API Security

### Paystack webhook

- Endpoint: `https://perfect-lark-521.convex.site/paystack/webhook`
- Invalid `x-paystack-signature` → **HTTP 401** (live test)
- Fulfillment only via `fulfillPayment` after amount/currency validation

**Classification:** VERIFIED OK

### Payment client trust

- Browser cannot mark payments successful without Convex `verifyPayment` / webhook
- Amount taken from server catalog at initialize; client cannot set GHS amount for fulfillment

**Classification:** VERIFIED OK

### POTENTIAL

- Webhook returns HTTP **200** on internal handler errors (prevents Paystack infinite retries). Monitor via Convex logs and `securityMonitoring` events.

---

## 5. Input / Output Security

| Area | Control | Status |
|------|---------|--------|
| Auth error messages | Token redaction (`publicAuthErrorMessage`) | VERIFIED OK |
| Markdown / mermaid | Sanitization tests in `tests/security/` | VERIFIED OK |
| Marketplace uploads | Policy tests | VERIFIED OK |
| Live web research | Secret redaction in responses (`liveWebSecurity.test.ts`) | VERIFIED OK |

---

## 6. Security Headers (production live)

Sampled from https://www.giga3ai.com/ :

| Header | Value (summary) |
|--------|-----------------|
| Strict-Transport-Security | 1 year, preload |
| Content-Security-Policy | default-src 'self'; connect-src includes Convex, Paystack, Supabase |
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Cross-Origin-Opener-Policy | same-origin-allow-popups |
| Cross-Origin-Resource-Policy | same-site |
| Permissions-Policy | camera, microphone, display-capture, geolocation (self) |

### CSP note

`script-src` includes `'unsafe-inline'` and `'wasm-unsafe-eval'`. Required for Next.js static export and some client features. **Classification:** CONFIRMED — REQUIRES SEPARATE SECURITY REMEDIATION (strict CSP / nonce strategy is a larger project).

---

## 7. PWA / Service Worker

| Check | Status |
|-------|--------|
| Private routes not precached | VERIFIED OK |
| `/chat/` not in PRECACHE array | VERIFIED OK |
| Private documents not stored in Cache API | VERIFIED OK |
| HTML documents network-first with no-store respect | VERIFIED OK |

Tests: `tests/security/enterprisePwa.test.ts` — **pass**

---

## 8. Dependencies

### npm audit summary (2026-10-01)

| Package tree | Critical | High | Moderate | Low | Total |
|--------------|----------|------|----------|-----|-------|
| `web/` | 1 | 10 | 3 | 1 | 15 |
| root | 0 | 3 | 4 | 0 | 7 |

Notable packages: `brace-expansion`, `browserslist`, `baseline-browser-mapping` (mostly dev/build toolchain).

**Classification:** CONFIRMED — REQUIRES SEPARATE SECURITY REMEDIATION  
**Recommendation:** Dedicated dependency upgrade PR with CI verification; do not `npm audit fix --force` on production branch without review.

---

## 9. CI/CD

| Workflow | Secret handling |
|----------|-----------------|
| `pages.yml` | Uses GitHub secrets for `NEXT_PUBLIC_*`; Convex URL health check with fallback |
| `convex-deploy.yml` | `CONVEX_DEPLOY_KEY`; syncs server secrets post-deploy |
| `ci-test.yml` | Runs vitest |

No plaintext secrets observed in workflow files. **VERIFIED OK**

---

## 10. Findings Table

| ID | Severity | Finding | Classification |
|----|----------|---------|----------------|
| SEC-001 | MEDIUM | 22 npm audit vulnerabilities (mostly dev deps) | SEPARATE REMEDIATION |
| SEC-002 | LOW | CSP `unsafe-inline` | SEPARATE REMEDIATION |
| SEC-003 | LOW | Webhook 200 on internal errors | POTENTIAL |
| SEC-004 | INFO | No secrets in tracked source | VERIFIED OK |
| SEC-005 | INFO | Auth session invariants | VERIFIED OK |
| SEC-006 | INFO | Paystack HMAC + server verify | VERIFIED OK |
| SEC-007 | INFO | Security headers on production | VERIFIED OK |
| SEC-008 | INFO | SW private-route cache policy | VERIFIED OK |

---

## 11. Recommended Next Steps (security)

1. Dependency upgrade PR scoped to audit fixes with full test suite.
2. Evaluate nonce-based or hash-based CSP when migrating off pure static export (long-term).
3. Alert on Convex `payment_amount_mismatch` and webhook error logs.
4. Rotate any credentials if future scans find exposure (none confirmed today).
5. Keep `PAYSTACK_REQUIRE_LIVE` optional flag under review for production hardening.

---

*This report contains no secret values. Locations and variable names only.*
