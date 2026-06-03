# AGENTS.md

## Cursor Cloud specific instructions

### Services

| Service | Path | Notes |
|---------|------|--------|
| Convex backend | `convex/` | Local: `npx convex dev` → `http://127.0.0.1:3210` (writes repo-root `.env.local`). Production: `perfect-lark-521` — see `DEPLOYMENT.md` |
| Next.js PWA (static export) | `web/` | Dev: `npm run dev` (port 3000). Build output: **`web/out`** |
| Legacy static site | `frontend/` | Uses Convex HTTP paths; config in `frontend/assets/js/config.js` |

### Local dev (two terminals / tmux)

1. **Convex:** from repo root, `CONVEX_LOCAL_BACKEND_STARTUP_TIMEOUT_SECS=180 npx convex dev` (first start on Cloud VMs can exceed the default 30s). Set `OPENAI_API_KEY` via `npx convex env set OPENAI_API_KEY …` on that deployment.
2. **Web:** `cd web`, copy `web/.env.local.example` → `web/.env.local` with `NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210` and `NEXT_PUBLIC_CONVEX_SITE_URL=http://127.0.0.1:3211`, then `npm run dev`. Chat entry: `http://localhost:3000/chat/login/`.

If local Convex cannot start, point `web/.env.local` at production URLs instead (chat may fail if production functions are out of date).

### Commands

- Install root: `npm ci --legacy-peer-deps`
- Install web: `cd web && npm ci --legacy-peer-deps` (or `npm install --legacy-peer-deps` if lockfile is missing)
- Lint: `cd web && npm run lint`
- Build: `cd web && NEXT_PUBLIC_CONVEX_URL=… npm run build` → `web/out/`
- Verify build env: `cd web && NEXT_PUBLIC_CONVEX_URL=… npm run verify:convex-env`
- Convex codegen: `npx convex codegen` (repo root)
- Convex deploy: `CONVEX_DEPLOY_KEY=… npx convex deploy --yes` (or `CONVEX_DEPLOYMENT_VALUE` secret). Deploy can fail if existing production `users` rows do not match `convex/schema.ts` (e.g. missing `credits`).
- Tests: root `npm test` is a stub (exits 1); no Jest/Playwright suite in-repo.

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
