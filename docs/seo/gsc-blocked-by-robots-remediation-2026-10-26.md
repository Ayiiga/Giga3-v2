# GSC “Blocked by robots.txt” remediation — 26 October 2026

**Site:** https://www.giga3ai.com/  
**Branch:** `cursor/seo-robots-indexing-remediation-161d`  
**GSC validation window cited:** 14–24 October 2026 (20 failed URLs)  
**Limitation:** Full 20-URL Search Console export was not available in this environment. Classification uses the example URLs from the request plus live robots/HTTP evidence.

## 1. Root cause

| Finding | Evidence |
|--------|----------|
| Live `robots.txt` returns **200** and matches repo `web/public/robots.txt` (pre-fix) | `curl` 2026-10-26 |
| Rule `Disallow: /chat/` blocks **all** `/chat/*` including `/chat/login/?next=…` | robots.txt + Google prefix matching |
| Rule `Disallow: /marketplace/purchases/` blocks purchase history | robots.txt |
| Product marketing gates emitted crawlable `href="/chat/login?next=…"` for every course/tech mode | `ProductSignInPrompt`, exam CTAs |
| Nested `?next=/…?slug=` variants multiplied discovery of blocked URLs | GSC examples |
| `/gigalearn/academy/course/?slug=…` is **not** robots-blocked; it is **noindex** (client shell) | Live HTML `robots=noindex`, robots rule = none |

GSC validation of “Blocked by robots.txt” **failed because those private/auth URLs correctly remained blocked**. Unblocking `/chat/` would be wrong. The durable fix is: (a) stop inventing crawlable login+next variants, (b) allow Google to crawl `/chat/login/` so it can see `noindex`, (c) keep private app surfaces disallowed.

## 2. Classification of known affected examples

| URL (decoded) | Access | Indexing decision | Live HTTP | Pre-fix robots | Remediation |
|---------------|--------|-------------------|-----------|-----------------|-------------|
| `/chat/login/?next=/gigalearn/academy/course/?slug=mobile-app-development` | Auth gate | **noindex** | 200 | Blocked by `/chat/` | Allow `/chat/login/`; stop emitting `?next=` in HTML; keep noindex |
| `/chat/login/?next=/gigalearn/academy/tech/?course=…&mode=…` (×4 modes/courses) | Auth gate | **noindex** | 200 | Blocked by `/chat/` | Same |
| `/chat/` | Private app | **noindex** | 200 | Blocked by `/chat/` | Keep Disallow; X-Robots-Tag |
| `/marketplace/purchases/` | Private | **noindex** | 200 | Blocked by `/marketplace/purchases/` | Keep Disallow; X-Robots-Tag |
| `/gigalearn/academy/course/?slug=exam-ad-i` | Public shell / enrol gated | **noindex** (static-export shell) | 200 | **Not blocked** | Keep noindex until per-slug static pages exist; ensure links go to course URL not login |

Public indexable hubs (unchanged, verified crawlable): `/gigalearn/academy/`, `/gigalearn/academy/courses/`, `/gigalearn/academy/tech/`, `/gigalearn/exam/`, blog, marketing landings.

## 3. robots.txt before → after

**Before (production):**

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /chat/
Disallow: /wallet/
…
Disallow: /marketplace/purchases/
Sitemap: https://www.giga3ai.com/sitemap.xml
```

**After (this PR):**

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /chat/
Allow: /chat/login/
Disallow: /wallet/
…
Disallow: /marketplace/purchases/
Sitemap: https://www.giga3ai.com/sitemap.xml
```

Google uses the longest matching rule: `/chat/login/` is allowed; `/chat/` app routes remain disallowed.

## 4. Sitemap eligibility

Unchanged allowlist approach (`sitemap.xml` index → static/blog/gigalearn/marketplace/gigasocial).  
Verified: no `/chat/`, `/marketplace/purchases/`, or `login?next=` locs.  
Query-parameter course URLs are **not** in the sitemap (correct for noindex shells).

## 5. Code changes

| File | Why |
|------|-----|
| `web/public/robots.txt` + `seo-route-policy.mjs` | Allow `/chat/login/` for noindex observation |
| `web/components/seo/ProductSignInPrompt.tsx` | Crawlable href = `/chat/login/` only; next via sessionStorage |
| `web/lib/auth/safePostLoginPath.ts` | Open-redirect-safe post-login path |
| `web/components/chat/ChatLoginForm.tsx` | Consume safe next from query or sessionStorage |
| Exam founding/premium CTAs + hydration notice | Same login discovery hygiene |
| `web/public/_headers` | `X-Robots-Tag: noindex, nofollow` on private prefixes |
| Tests | robots Allow rule + ProductSignInPrompt + safePostLoginPath |

## 6. Search Console next steps (owner)

1. Deploy this PR to production (Cloudflare Pages).  
2. Confirm live `robots.txt` contains `Allow: /chat/login/`.  
3. URL Inspection on a former `login?next=` URL → should be allowed by robots, noindex.  
4. Start a **new** “Blocked by robots.txt” validation only after deploy. Remaining intentional blocks (`/chat/` app, purchases) may still appear — that is expected.  
5. Do **not** request indexing for login, chat, wallet, or purchases.

## 7. Not done / out of scope

- Full 20-URL GSC CSV (needs owner export).  
- Per-slug static course pages (`/gigalearn/academy/course/[slug]/`) — architectural follow-up if public course SEO is required.  
- Production deploy/merge awaits release authorization.
