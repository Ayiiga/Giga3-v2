# Step 9 — Global Platform, Scalability & Production Excellence

This document summarizes incremental production-hardening shipped in Step 9. All changes are **additive and backward compatible** — no schema migrations, no auth changes, no API removals.

## Localization foundation

| Module | Purpose |
|--------|---------|
| `web/lib/locale.ts` | Single source for `DEFAULT_LOCALE` (`en-GH`), HTML lang, OG locale, timezone (`Africa/Accra`), currency (`GHS`) |
| `web/lib/datetime.ts` | Re-exports `PRODUCT_LOCALE` from locale module |
| `web/lib/payments/plans.ts` | `formatGhs()` delegates to `formatCurrency()` |

English (Ghana) remains the default. Full i18n (message catalogs, route prefixes) is deferred to a future release.

## Reliability & observability

| Capability | Location |
|------------|----------|
| **Health probe** | `GET https://<deployment>.convex.site/health` — JSON `{ ok, service, version, ts }`, no PII |
| **Paystack HTTP retry** | `convex/paystack.ts` — `withRetries` on POST/GET (transient network / 5xx) |
| **Supabase chat send retry** | `web/hooks/useSupabaseChatPlatform.ts` — parity with `useChatPlatform` exponential backoff |
| **User-facing errors** | `web/lib/errors/userMessage.ts` — strips tokens, secrets, stack traces |
| **Marketing error boundary** | `web/app/(marketing)/error.tsx` |
| **Platform analytics** | Existing `platformStats:heartbeat` + `PlatformAnalytics` (45s interval) |

Client diagnostics use `logClientDiagnostic()` — safe fields only; suppressed in production console unless `NODE_ENV !== "production"`.

## SEO & discoverability

| Item | Location |
|------|----------|
| **Sitemap** | `web/app/sitemap.ts` → `/sitemap.xml` at build (public marketing routes only) |
| **robots.txt** | Already references sitemap — no change required |
| **JSON-LD** | `web/components/seo/JsonLd.tsx` on marketing layout (`WebSite` + `Organization`) |

Excluded from sitemap (same as `robots.txt`): `/chat/`, `/payment/`, `/marketplace/sell/`, admin flows.

## Accessibility

| Item | Location |
|------|----------|
| Skip link | `web/components/a11y/SkipToContent.tsx` |
| Main landmark | `id="main-content"` on marketing `<main>` |
| Focus styles | Existing `globals.css` `focus-visible` ring on interactive elements |

Chat routes retain `chat-stable` layout constraints from prior steps.

## Caching & PWA

After deploy, users should hard-refresh or clear the service worker cache.

- Service worker cache name: **`giga3-shell-v80-step-9-global`** (`web/public/sw.js`)

## Operational procedures

### Smoke test after deploy

1. `curl -s https://perfect-lark-521.convex.site/health` → `"ok":true`
2. Open `https://www.giga3ai.com/sitemap.xml` — public URLs listed
3. Hard-refresh PWA / bump SW cache if shell is stale
4. Spot-check chat send on slow network (retry should recover)

### Monitoring recommendations (future)

- Uptime monitor on `/health` (Convex site URL)
- Cloudflare Pages analytics for TTFB / cache hit rate
- Convex dashboard for function latency and error rates
- Paystack dashboard for webhook delivery

## Security notes (Step 9 review)

- Health endpoint exposes no user data or secrets
- `toUserFacingError` redacts API keys and session tokens from UI copy
- Logs intentionally omit email, tokens, and payment identifiers in client diagnostics
- No changes to session auth, RBAC, or webhook HMAC verification

## QA checklist (verified at implementation)

| Area | Status |
|------|--------|
| AI Assistant / chat | Unchanged routing; retry parity for Supabase mode |
| Creator Studio, Media, Video | Unchanged |
| GigaLearn, GigaSocial, Marketplace | Unchanged |
| GigaWallet, Enterprise, Automation | Unchanged |
| Authentication | Unchanged |
| PWA / offline page | SW cache bumped |
| Production deploy | Convex + Cloudflare CI on `main` |

## Remaining recommendations (future versions)

1. **Full i18n** — `next-intl` or similar with message catalogs and locale routes
2. **Server-side error aggregation** — Sentry / OpenTelemetry on Convex actions
3. **CDN cache headers audit** — per-route `Cache-Control` on static marketing assets
4. **Automated a11y CI** — axe-core in GitHub Actions on marketing pages
5. **Rate-limit dashboard** — admin view for abuse signals

---

*Step 9 completes the production-readiness pass for Giga3 AI while preserving all functionality from Steps 1–8.*
