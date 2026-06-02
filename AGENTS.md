# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

Giga3 AI is a static HTML/JS frontend (`frontend/`) plus a Convex TypeScript backend (`convex/`). There is a single root `package.json` (npm). No Docker, no Python, and no formal monorepo workspaces.

### Services (local development)

| Service | Command | Notes |
|--------|---------|--------|
| Convex backend | `npx convex dev` | Anonymous local deployment by default; URLs written to `.env.local` (`CONVEX_URL` is typically `http://127.0.0.1:3210`). Dashboard at port `6790`. |
| Frontend | `npx --yes serve frontend -l 5173` | Static files only; open `http://127.0.0.1:5173/login.html`. `config.js` auto-selects local Convex when the page is served from `127.0.0.1` / `localhost`. |

Run Convex **before** exercising the UI. Both processes are long-running; use tmux (or separate terminals).

### Dependencies

```bash
npm install
```

There is **no** ESLint/Prettier script in `package.json`. `npm test` is a placeholder and exits with an error.

### Convex secrets (required for real chat)

Set on the active deployment (local anonymous or Convex Cloud):

```bash
npx convex env set OPENAI_API_KEY <your-key>
```

Optional for Stripe checkout flows:

```bash
npx convex env set STRIPE_SECRET_KEY <your-key>
npx convex env set FRONTEND_URL http://127.0.0.1:5173
```

### HTTP API

The frontend uses `frontend/assets/js/convexHttp.js`, which calls Convex’s `/api/query`, `/api/mutation`, and `/api/action` endpoints (not legacy `/query/...` paths).

### Gotchas discovered during setup

- **`convex/payments.ts`**: Had stray `+` diff markers in `createCheckout`; Convex will not compile until those are removed.
- **`convex/ai.ts` / `convex/payments.ts` `confirmPurchase`**: Actions must use `ctx.runQuery` / `ctx.runMutation` (not `ctx.db`) when talking to the database.
- **Committed Cloud URL** (`perfect-lark-521.convex.cloud` in older `config.js`): Returned 404 for function routes during setup; prefer local `npx convex dev` or your own Convex Cloud deployment URL in `config.js`.
- **`npx convex dev --once`**: May fail if it cannot reach Convex’s servers to check backend version; the long-running `npx convex dev` watcher still hot-reloads function changes when already running.
- **Auth signup path**: `auth.js` should call `users:createUser` as a **mutation** (not `/action/...`).

### Smoke test (API)

```bash
curl -sS -X POST "http://127.0.0.1:3210/api/query" \
  -H "Content-Type: application/json" \
  -d '{"path":"users:getUser","args":{"email":"you@example.com"},"format":"json"}'
```

### Smoke test (UI)

1. `npx convex dev` and `npx serve frontend -l 5173`
2. Open `http://127.0.0.1:5173/login.html`, enter any email, go to dashboard
3. Send a chat message (requires valid `OPENAI_API_KEY` on the Convex deployment)
