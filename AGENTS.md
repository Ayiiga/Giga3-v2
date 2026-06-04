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
- Dev server: `cd web && npm run dev` → `http://localhost:3000` (copy `web/.env.local.example` → `web/.env.local` first)
- Serve static export: `cd web/out && npx serve -s . -l 3456`
- Convex codegen: `CONVEX_DEPLOY_KEY="$CONVEX_DEPLOYMENT_VALUE" npx convex codegen` (or `npx convex dev` after linking a project)
- Convex deploy: `CONVEX_DEPLOY_KEY=… npx convex deploy --yes`
- Automated tests: none in repo (`npm test` at root exits 1 by design)

### Build-time env (web)

Set in `web/.env.local` or CI secrets:

- `NEXT_PUBLIC_CONVEX_URL` — required for production build (CI uses GitHub secret)
- `NEXT_PUBLIC_CONVEX_SITE_URL` — optional (HTTP actions URL)
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — optional in UI

### Paystack (live billing)

- **Server secret (required):** `PAYSTACK_SECRET_KEY` on Convex (`sk_live_…`). Checkout runs in `convex/paystack.ts` actions — not in the browser.
- **Public key:** `PAYSTACK_PUBLIC_KEY` on Convex (optional today; reserved). `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` in GitHub is optional for future client use.
- **Redirects:** `FRONTEND_URL` must be `https://www.giga3ai.com` (success: `/payment/success/?reference=…`).
- **Webhook (Paystack dashboard):** `https://perfect-lark-521.convex.site/paystack/webhook` — subscribe to **`charge.success`**. Uses the same `PAYSTACK_SECRET_KEY` for HMAC verification.
- Sync keys to Convex: `npx convex env set PAYSTACK_SECRET_KEY "sk_live_…"` or add GitHub secrets `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` (CI syncs on Convex deploy).

### Convex production env

Production deployment: **`perfect-lark-521`** (`https://perfect-lark-521.convex.cloud`).

- `users:getUser` is a **public query** in `convex/users.ts`. If the client reports it is missing, production has not received a successful deploy.
- HTTP and WebSocket to `*.convex.cloud` work from this VM when `web/.env.local` points at production. `npx convex codegen` / deploy still need `CONVEX_DEPLOY_KEY` (Cloud secret `CONVEX_DEPLOYMENT_VALUE` works). If `api.convex.dev` returns 401, you have not authenticated — use the deploy key, not `npx convex dev` alone.
- Chat UI needs a real login at `/chat/login/` (sets `localStorage` key `giga3_user_email`); manually setting localStorage alone can leave Convex queries stuck on “Loading chats…”.
- If CI fails in ~20s at **Deploy to Convex** after key format validation passes, regenerate `CONVEX_DEPLOY_KEY` (`prod:perfect-lark-521|…`) in Convex Dashboard → production → Settings → Deploy key.

### Frontend HTTP paths (static `frontend/`)

- Mutations: `/mutation/<module>:<name>` (e.g. `users:createUser`)
- Queries: `/query/<module>:<name>` (e.g. `users:getUser`)
- Actions: `/action/<module>:<name>` (e.g. `aiActions:askAI`, `platformActions:sendMessage`, `stripeActions:createCheckout`)
