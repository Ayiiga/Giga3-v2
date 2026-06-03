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
- Dev server: `cd web && npm run dev` → http://localhost:3000 (chat login: `/chat/login/`)
- Convex codegen: `CONVEX_DEPLOY_KEY=… npx convex codegen` (uses deploy key from secrets)
- Convex deploy: `npx convex deploy --yes` (requires `CONVEX_DEPLOY_KEY`)

There is no root `lint`/`build`/`dev` script — run those from `web/`.

### Local dev env file

Create `web/.env.local` once (gitignored; copy from `web/.env.local.example`). For Cloud Agent VMs without a local Convex dev process, point at production:

```env
NEXT_PUBLIC_CONVEX_URL=https://perfect-lark-521.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://perfect-lark-521.convex.site
```

Optional: run `npx convex dev` at repo root for a local backend (`http://127.0.0.1:3210`) and set those URLs instead.

### Build-time env (web)

Set in `web/.env.local` or CI secrets:

- `NEXT_PUBLIC_CONVEX_URL` — required for production build (CI uses GitHub secret)
- `NEXT_PUBLIC_CONVEX_SITE_URL` — optional (HTTP actions URL)
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — optional in UI

### Convex production env

Production deployment: **`perfect-lark-521`** (`https://perfect-lark-521.convex.cloud`).

- `users:getUser` is a **public query** in `convex/users.ts`. If the client reports it is missing, production has not received a successful deploy.
- This Cloud Agent VM often **cannot** reach `api.convex.dev` or `*.convex.cloud` (TLS). Use GitHub Actions **Deploy Convex backend** or a local machine for codegen/deploy.
- If CI fails in ~20s at **Deploy to Convex** after key format validation passes, regenerate `CONVEX_DEPLOY_KEY` (`prod:perfect-lark-521|…`) in Convex Dashboard → production → Settings → Deploy key.

### Frontend HTTP paths (static `frontend/`)

- Mutations: `/mutation/<module>:<name>` (e.g. `users:createUser`)
- Queries: `/query/<module>:<name>` (e.g. `users:getUser`)
- Actions: `/action/<module>:<name>` (e.g. `aiActions:askAI`, `platformActions:sendMessage`, `stripeActions:createCheckout`)
