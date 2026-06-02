# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

Giga3 AI is a Convex backend (`convex/`) with a Next.js 14 app in `web/` (static export → `web/out` → Cloudflare Pages via GitHub Actions on `main`). Legacy static UI remains in `frontend/`.

### Services (local development)

| Service | Command | Notes |
|--------|---------|--------|
| Convex backend | `npx convex dev` | If CLI fails on version check, start the local binary (see below). URLs in `.env.local` (`CONVEX_URL` → `http://127.0.0.1:3210`). |
| Legacy chat UI | `npx --yes serve frontend -l 5173` | `config.js` auto-uses local Convex on `127.0.0.1` / `localhost`. |
| Next.js site | `cd web && npm run dev` | Port 3000; `npm run build` → `web/out/`. |

Use tmux for long-running processes.

### Dependencies

```bash
npm install              # root: convex, openai, stripe
cd web && npm install    # Next.js app (separate from root lockfile)
```

No real test suite (`npm test` at root is a placeholder). Next.js: `npm run build:web` or `cd web && npm run lint && npm run build`.

**Deploy:** See `DEPLOYMENT.md`. Pushing `main` deploys `web/out` to Cloudflare Pages. This VM may hit `ECONNRESET` on npm; verify builds in CI or locally.

### Secrets

```bash
npx convex env set OPENAI_API_KEY "$OPENAI_API_KEY"
```

Optional: `STRIPE_SECRET_KEY`, `FRONTEND_URL=http://127.0.0.1:5173`, Paystack keys for billing.

**Cloud Agent note:** Outbound HTTPS to `api.openai.com` may be blocked in some VMs (SSL/connect errors). Login, queries, and chat actions still prove the stack; full AI replies need egress or run chat tests outside the sandbox.

### Convex CLI offline workaround

If `npx convex dev` fails with "Failed to fetch latest backend version", start the cached backend manually, then run the CLI watcher in another terminal:

```bash
~/.cache/convex/binaries/*/convex-local-backend \
  --port 3210 --site-proxy-port 3211 \
  --instance-name anonymous-workspace \
  --instance-secret "$(grep instance-secret .env.local 2>/dev/null || echo '')" \
  --local-storage /workspace/.convex/local/default/convex_local_storage \
  /workspace/.convex/local/default/convex_local_backend.sqlite3
```

(Use the `instance-secret` from your existing anonymous dev setup in `.convex/`.)

### HTTP API

Frontend uses `frontend/assets/js/convexHttp.js` → `/api/query`, `/api/mutation`, `/api/action`.

### Smoke test (API)

```bash
curl -sS -X POST "http://127.0.0.1:3210/api/query" \
  -H "Content-Type: application/json" \
  -d '{"path":"users:getUser","args":{"email":"you@example.com"},"format":"json"}'
```

### Smoke test (UI)

1. Start Convex + `npx serve frontend -l 5173` or `cd web && npm run dev`
2. Open chat login or legacy login, sign in, send a message (requires `OPENAI_API_KEY` on Convex and outbound access to OpenAI)
