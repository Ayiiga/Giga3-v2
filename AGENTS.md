# AGENTS.md

## Cursor Cloud specific instructions

### Services

| Service | Path | Notes |
|---------|------|--------|
| Convex backend | `convex/` | Deploy via CI or `npx convex deploy` — see `DEPLOYMENT.md` |
| Next.js PWA (static export) | `web/` | Output: **`web/out`** (not `.next`) |
| Legacy static site | `frontend/` | Uses Convex HTTP paths; config in `frontend/assets/js/config.js` |

### Commands

**Install (repo root, then web):**

- Root (Convex CLI): `npm ci --legacy-peer-deps`
- Web app: `cd web && npm ci --legacy-peer-deps` (or `npm install --legacy-peer-deps` if lockfile missing)

**Lint / build / dev (run from `web/` — root `package.json` has no lint/build scripts):**

- Lint: `cd web && npm run lint`
- Build (static export → `web/out`): `cd web && npm run build`
- Dev server: `cd web && npm run dev` → http://localhost:3000 (chat login: `/chat/login/`)
- Verify Convex URL in build: `cd web && npm run verify:convex-env` (needs `NEXT_PUBLIC_CONVEX_URL` set)

**Convex (repo root):**

- Codegen: `npx convex codegen` (needs `CONVEX_DEPLOYMENT` and `npx convex dev` login, or use CI/deploy)
- Deploy: `npx convex deploy --yes` (requires `CONVEX_DEPLOY_KEY`)

**Tests:** No unit/integration test suite; root `npm test` is a placeholder and exits 1.

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
