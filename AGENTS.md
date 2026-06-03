# AGENTS.md

## Cursor Cloud specific instructions

### Services

| Service | Path | Notes |
|---------|------|--------|
| Convex backend | `convex/` | Deploy via CI or `npx convex deploy` — see `DEPLOYMENT.md` |
| Next.js PWA (static export) | `web/` | Output: **`web/out`** (not `.next`) |
| Legacy static site | `frontend/` | Uses Convex HTTP paths; config in `frontend/assets/js/config.js` |

### Commands

- Install root: `npm ci --legacy-peer-deps` (repo root)
- Install web: `cd web && npm install --legacy-peer-deps`
- Lint / build (from `web/`): `npm run lint`, `npm run build` → static export in **`web/out`**
- Root `npm test` is a placeholder and exits 1 — there is no automated test suite yet
- Convex codegen: `npx convex codegen` (requires `CONVEX_DEPLOYMENT` in root `.env.local`, created by `npx convex dev`)
- Convex deploy: `npx convex deploy --yes` (requires `CONVEX_DEPLOY_KEY`)

### Local dev (two processes)

1. **Convex:** repo root — `npx convex dev` (first run creates root `.env.local` with `CONVEX_DEPLOYMENT`; serves `http://127.0.0.1:3210`, HTTP actions `http://127.0.0.1:3211`, dashboard `http://127.0.0.1:6790`)
2. **Next.js:** `cd web && npm run dev` — set `web/.env.local` to `NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210` (and matching site URL) while Convex dev is running

Set `OPENAI_API_KEY` on the active Convex deployment: `npx convex env set OPENAI_API_KEY "$OPENAI_API_KEY"`. New users need credits for chat (`credits:grantCredits` via dashboard/CLI) unless they subscribe.

Production **`perfect-lark-521`** may be out of sync with this repo (e.g. missing `users:getUser`); prefer local `npx convex dev` for full chat E2E on Cloud Agent VMs.

### Build-time env (web)

Set in `web/.env.local` or CI secrets:

- `NEXT_PUBLIC_CONVEX_URL` — required for production build (CI uses GitHub secret)
- `NEXT_PUBLIC_CONVEX_SITE_URL` — optional (HTTP actions URL)
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — optional in UI

### Convex production env

Production deployment: **`perfect-lark-521`** (`https://perfect-lark-521.convex.cloud`).

- `users:getUser` is a **public query** in `convex/users.ts`. If the client reports it is missing, production has not received a successful deploy.
- Some Cloud Agent VMs cannot reach `api.convex.dev` or `*.convex.cloud` (TLS). If `npx convex dev` / deploy fails, use GitHub Actions **Deploy Convex backend** or a local machine. When reachable, `npx convex dev` is the fastest path for chat E2E.
- If CI fails in ~20s at **Deploy to Convex** after key format validation passes, regenerate `CONVEX_DEPLOY_KEY` (`prod:perfect-lark-521|…`) in Convex Dashboard → production → Settings → Deploy key.

### Frontend HTTP paths (static `frontend/`)

- Mutations: `/mutation/<module>:<name>` (e.g. `users:createUser`)
- Queries: `/query/<module>:<name>` (e.g. `users:getUser`)
- Actions: `/action/<module>:<name>` (e.g. `aiActions:askAI`, `platformActions:sendMessage`, `stripeActions:createCheckout`)
