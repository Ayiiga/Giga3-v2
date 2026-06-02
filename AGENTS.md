# AGENTS.md

## Cursor Cloud specific instructions

### Services

| Service | Path | Notes |
|---------|------|--------|
| Convex backend | `convex/` | `npx convex dev` / `npx convex deploy` from repo root |
| Next.js PWA (static export) | `web/` | Output: **`web/out`** (not `.next`) |
| Legacy static site | `frontend/` | Not deployed by CI; optional reference only |

### Commands (from repo root)

- Install root: `npm ci --legacy-peer-deps` (or `npm install` if no lockfile change)
- Install web: `cd web && npm install --legacy-peer-deps`
- Lint: `npm run lint` (runs `web` ESLint)
- Build: `npm run build` (static export to `web/out`)
- Convex codegen: `npx convex codegen`

### Build-time env (web)

Set in `web/.env.local` or CI secrets:

- `NEXT_PUBLIC_CONVEX_URL` — required for production build (CI uses GitHub secret)
- `NEXT_PUBLIC_CONVEX_SITE_URL` — optional (HTTP actions URL)
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — optional in UI

### Convex production env

Set in Convex dashboard: `OPENAI_API_KEY`, `PAYSTACK_SECRET_KEY`, `FRONTEND_URL` (e.g. `https://www.giga3ai.com`), plus `REPLICATE_API_TOKEN` for media.

Paystack webhook: `https://<deployment>.convex.site/paystack/webhook`

### Cloudflare Pages

- Project name: **`giga3ai`**
- Build: `cd web && npm install --legacy-peer-deps && npm run build`
- Output directory: **`web/out`**
- `_redirects` in `web/public/_redirects` (static export uses per-route HTML; not SPA `/* /index.html 200`)

### Gotchas

- Static export + `useSearchParams`: payment pages wrap hooks in `<Suspense>`; `next.config.mjs` sets `experimental.missingSuspenseWithCSRBailout: false`.
- Convex hooks must not run during SSR: billing/chat/media pages use `dynamic(..., { ssr: false })` and `mounted` guards before `useQuery`.
- VM npm registry access may fail locally; rely on GitHub Actions for full `next build` verification when network is restricted.
