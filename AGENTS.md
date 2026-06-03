# AGENTS.md

## Cursor Cloud specific instructions

### Services

| Service | Path | Notes |
|---------|------|--------|
| Convex backend | `convex/` | Deploy via CI or `npx convex deploy` — see `DEPLOYMENT.md` |
| Next.js PWA (static export) | `web/` | Output: **`web/out`** (not `.next`) |
| Legacy static site | `frontend/` | Uses Convex HTTP paths; config in `frontend/assets/js/config.js` |

### Commands (from repo root)

- Install root: `npm ci --legacy-peer-deps`
- Install web: `cd web && npm install --legacy-peer-deps`
- Lint: `cd web && npm run lint`
- Build: `cd web && npm run build` (static export to `web/out`)
- Dev server: `cd web && npm run dev` → `http://localhost:3000` (chat login at `/chat/login/`)
- Convex codegen: `npx convex codegen` (requires `npx convex dev` login or `.env.local` with `CONVEX_DEPLOYMENT`; committed types live in `convex/_generated/`)
- Convex deploy: `npx convex deploy --yes` (requires `CONVEX_DEPLOY_KEY`)

### Local dev without `npx convex dev`

If Convex CLI login is unavailable, point the Next.js app at production:

```bash
cd web
cp .env.local.example .env.local
# set NEXT_PUBLIC_CONVEX_URL=https://perfect-lark-521.convex.cloud
# set NEXT_PUBLIC_CONVEX_SITE_URL=https://perfect-lark-521.convex.site
npm run dev
```

This is enough for UI + chat E2E against the deployed backend. Use `npx convex dev` when changing `convex/` functions locally.

### Build-time env (web)

Set in `web/.env.local` or CI secrets:

- `NEXT_PUBLIC_CONVEX_URL` — required for production build (CI uses GitHub secret)
- `NEXT_PUBLIC_CONVEX_SITE_URL` — optional (HTTP actions URL)
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — optional in UI

### Convex production env

Production deployment: **`perfect-lark-521`** (`https://perfect-lark-521.convex.cloud`).

- `users:getUser` is a **public query** in `convex/users.ts`. If the client reports it is missing, production has not received a successful deploy.
- Convex **client** endpoints (`*.convex.cloud`) are reachable from this VM for dev/testing. Convex **CLI** codegen/deploy may still require `npx convex login` or `CONVEX_DEPLOY_KEY`; use GitHub Actions **Deploy Convex backend** when CLI auth is missing.
- If CI fails in ~20s at **Deploy to Convex** after key format validation passes, regenerate `CONVEX_DEPLOY_KEY` (`prod:perfect-lark-521|…`) in Convex Dashboard → production → Settings → Deploy key.

### Frontend HTTP paths (static `frontend/`)

- Mutations: `/mutation/<module>:<name>` (e.g. `users:createUser`)
- Queries: `/query/<module>:<name>` (e.g. `users:getUser`)
- Actions: `/action/<module>:<name>` (e.g. `aiActions:askAI`, `platformActions:sendMessage`, `stripeActions:createCheckout`)
