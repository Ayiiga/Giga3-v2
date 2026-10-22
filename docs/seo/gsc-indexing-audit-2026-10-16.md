# Google Search Console indexing audit — 16 October 2026 report

**Site:** https://www.giga3ai.com/  
**Audit date:** 22 October 2026 (Africa/Accra)  
**Branch:** `cursor/gsc-indexing-audit-161d`  
**Deploy:** not performed by this audit (code + PR only)

## Limitation (Search Console URL export)

No authenticated Google Search Console integration and no exported URL list were available in this environment. Category **counts** from the 16 October 2026 report were used for diagnosis, but **exact GSC-listed URLs were not invented**. Where a root cause is confirmed from live HTTP/HTML/sitemap evidence, affected URL patterns are named explicitly. Remaining per-URL classification still needs a GSC export (Pages → Not indexed → Export).

## Phase 1 — Live inventory (production)

| Source | Result |
|--------|--------|
| `robots.txt` | Allows `/`; disallows private prefixes (`/chat/`, `/wallet/`, `/settings/`, …); one sitemap |
| Sitemap index | `sitemap-static`, `sitemap-blog`, `sitemap-gigalearn`, `sitemap-marketplace`, `sitemap-gigasocial` |
| Sitemap URLs | **184** locs; probe: all **HTTP 200**, self-canonical, `index, follow` (artifact: `/opt/cursor/artifacts/gsc-sitemap-probe.json`) |
| Apex host | `giga3ai.com` → **301** `www.giga3ai.com` (middleware) |
| Intentional noindex | Chat/wallet/settings/admin, retired Media/Video/GigaEdit/AI Studio shells, help/offline/whats-new/insights, seller/purchases |

### Intentional exclusions (do not “fix” into index)

- Private: `/chat/*`, `/wallet/*`, `/credits/*`, `/payment/*`, `/settings/*`, `/profile/*`, `/subscribe/*`, `/admin/*`, `/marketplace/sell/`, `/marketplace/purchases/`
- Product shells / retired: `/media/`, `/video/`, `/gigaedit/`, `/ai-studio/`, `/gigaedits/`, `/whats-new/`, `/insights/`, `/home/`
- Utility: `/help/`, `/offline/`, `/offline.html`

## Phase 2 — Category diagnosis (evidence-based)

| GSC category (count) | Likely cause from live evidence | Action |
|----------------------|----------------------------------|--------|
| Discovered — not indexed (89) | Large UGC sitemap (`sitemap-gigasocial.xml` ~108 posts/profiles); many thin posts/profiles | Tighten sitemap eligibility (code fix) |
| Page with redirect (35) | Expected: trailing-slash 308s, apex→www, legacy `/learn`→`/gigalearn`, `/privacy`→`/legal/privacy`, blog slug aliases, `*.html` legacy | Preserve; request GSC export to confirm none are loops |
| Alternative with proper canonical (24) | Valid consolidation (non-www, aliases, trailing slash) | Preserve |
| Crawled — not indexed (8) | Quality/selection; may include thin landings or UGC | Needs GSC URL export |
| Excluded by noindex (4) | Intentional shells (e.g. help/offline/whats-new/retired) | Preserve |
| Redirect error (1) | Strong candidate: `/404.html` ↔ pretty `/404` with canonical pointing at `/404.html` while asset layer 308s | Fixed |
| Soft 404 (1) | **Confirmed:** `/404` and `/404/` return **HTTP 200** with “Page not found” | Fixed |
| Duplicate without user-selected canonical (1) | Strong candidate: noindex pages inheriting root `canonical: /` (`/marketplace/sell/`, `/marketplace/purchases/`) | Fixed |
| Blocked by robots.txt (1) | Likely a private path under Disallow (e.g. `/chat/`) — intentional | Preserve; confirm via export |

### Confirmed production bugs (pre-fix)

1. **Soft 404:** `https://www.giga3ai.com/404` and `/404/` → 200 + noindex + title “Page not found”. Unknown URLs correctly return 404; the pretty-URL of `404.html` did not.
2. **Redirect / canonical conflict on 404:** `not-found` previously used `canonical: "/404.html"` (asset layer 308 → `/404`) or inherited the homepage canonical when omitted. Now uses `/404/` and middleware returns HTTP 404 for `/404*`.
3. **PWA offline shell broken for crawlers/SW fetch:** `/offline.html` → 308 → `/offline` (marketing page) because both `public/offline.html` and `app/(marketing)/offline` exist; middleware `ASSETS.fetch` followed the asset-layer pretty URL.
4. **Homepage canonical leak:** `/marketplace/sell/` and `/marketplace/purchases/` were `noindex` but canonical `https://www.giga3ai.com/`. `/chat/login/` canonicalized to `/chat/`.
5. **Internal links to retired noindex routes** in blog articles and content plan (`/media/`, `/video/`, `/gigaedit/`, `/ai-studio/`).
6. **Thin UGC in sitemap** without minimum body/media or profile quality thresholds — drives Discovered-not-indexed volume.

## Phase 3 — Fixes implemented (this PR)

| Fix | Files | Exact URL patterns affected |
|-----|-------|-----------------------------|
| Soft 404 → real HTTP 404 | `web/functions/_middleware.js` | `/404`, `/404/`, `/404.html`, `/404.html/` |
| Remove conflicting 404 canonical | `web/app/not-found.tsx` | not-found document |
| Serve `/offline.html` from bundled HTML | `web/functions/_middleware.js`, `web/functions/offlinePageHtml.js` | `/offline.html` (200, noindex); `/offline.html/` → 301 `/offline.html` |
| Self-canonicals on private shells | sell/purchases/chat login pages | `/marketplace/sell/`, `/marketplace/purchases/`, `/chat/login/` |
| Sitemap quality gates | `convex/publicSeo.ts` | GigaSocial post/profile locs in `sitemap-gigasocial.xml` (after next Convex + Pages deploy) |
| Retarget internal links | blog content + `contentPlan.ts` | Crawl paths from articles → creator-studio / documents / gigasocial / gigalearn |
| SW cache bump | `web/public/sw.js` | `giga3-v57` (clients pick up offline shell after deploy) |

## Phase 4 — Validation

See PR / agent run logs for lint, unit tests, and `web` production build. Live production will only reflect middleware/HTML fixes **after** Cloudflare Pages deploy; Convex sitemap filters require Convex deploy.

## Phase 5 — Reindex / owner follow-ups

### Submit for reindexing after deploy (canonical public URLs)

Priority education + marketing (already 200/self-canonical in sitemap):

- `https://www.giga3ai.com/`
- `https://www.giga3ai.com/gigalearn/`
- `https://www.giga3ai.com/gigalearn/academy/`
- `https://www.giga3ai.com/gigalearn/exam/`
- `https://www.giga3ai.com/ai-for-bece-wassce-ghana/`
- `https://www.giga3ai.com/ai-tools-for-students-ghana/`
- `https://www.giga3ai.com/blog/`
- Key blog posts updated in this PR (creator/education internal links)

Also request removal/recrawl for:

- `https://www.giga3ai.com/404` (should become true 404)
- `https://www.giga3ai.com/offline.html` (should 200 with PWA shell, noindex)

### Still need from Search Console

Export URL lists for each “Why pages aren’t indexed” reason and attach to a follow-up. Without that export, per-URL mapping for the remaining ~160 “not indexed” rows cannot be completed honestly.

### Do not force-index

Private account routes, retired product shells, seller dashboards, and thin UGC that fails the new sitemap gates.
