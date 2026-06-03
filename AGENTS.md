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

**Client env convention (Next.js only):** `NEXT_PUBLIC_CONVEX_URL` (required), `NEXT_PUBLIC_CONVEX_SITE_URL` (optional). Do not use `EXPO_PUBLIC_*`.

- **GitHub Actions deploy (default):** set secrets in the repo; CI bakes URLs into `web/out` via `pages.yml`.
- **Cloudflare-native build:** set the same `NEXT_PUBLIC_*` names in Pages → Settings → Environment variables (Production).


### Multi-provider chat (failover)

`convex/chatEngine.ts` tries chat backends in order until one succeeds:

1. **openai_primary** — `OPENAI_MODEL` (default `gpt-4o-mini`)
2. **openai_fallback_model** — `OPENAI_FALLBACK_MODEL` (default `gpt-3.5-turbo`)
3. **openai_retry** — primary model with shorter history
4. **openai_secondary_key** — optional `OPENAI_FALLBACK_API_KEY`
5. **gemini** — `GEMINI_API_KEY` + `GEMINI_MODEL` (default `gemini-2.5-flash`)
6. **fal_ai** — `FAL_KEY` or `FAL_API_KEY` + `FAL_MODEL` (default `google/gemini-2.5-flash` via fal OpenRouter)
7. **local_fallback** — user-visible notice (no credit charge)

Convex env:

```bash
npx convex env set GEMINI_API_KEY "your-google-ai-studio-key"
npx convex env set GEMINI_MODEL "gemini-2.5-flash"
npx convex env set FAL_KEY "your-fal-api-key"
npx convex env set FAL_MODEL "google/gemini-2.5-flash"
```

Also: `OPENAI_API_KEY`, optional `OPENAI_FALLBACK_MODEL`, `OPENAI_FALLBACK_API_KEY`.

### Gotchas

- **Convex + Next static export**: `web/next.config.mjs` needs `experimental.externalDir`, `transpilePackages: ["convex"]`, a webpack rule for `convex/_generated/*.js`, and `resolve.alias` for `convex/server` → `web/node_modules/convex/server`.
- Convex hooks: wrap client trees with `ConvexAppShell`, use `dynamic(..., { ssr: false })`, and `mounted` guards before `useQuery`.
- Payment pages wrap `useSearchParams` in `<Suspense>`.
- CI: use `set -o pipefail` when piping `npm run build` to `tee`.
- VM npm registry access may fail locally; use GitHub Actions to verify production builds.
