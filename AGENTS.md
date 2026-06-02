# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

Giga3 AI is a static HTML/JS chat app (`frontend/`) plus Convex backend (`convex/`). A Next.js 14 marketing site lives in `web/` (static export → Cloudflare Pages).

### Services (local development)

| Service | Command | Notes |
|--------|---------|--------|
| Convex backend | `npx convex dev` | If CLI fails on version check, start the local binary (see below). URLs in `.env.local` (`CONVEX_URL` → `http://127.0.0.1:3210`). |
| Legacy chat UI | `npx --yes serve frontend -l 5173` | `config.js` auto-uses local Convex on `127.0.0.1` / `localhost`. |
| Next.js site | `cd web && npm run dev` | Port 3000; `npm run build` → `web/out/`. |

Use tmux for long-running processes.

### Dependencies

```bash
npm install          # root: Convex + workspace web/
cd web && npm install   # if workspace install fails
```

No real test suite (`npm test` at root is a placeholder). Next.js: `npm run build -w giga3-ai-web` or `cd web && npm run build`.

### Secrets

```bash
npx convex env set OPENAI_API_KEY "$OPENAI_API_KEY"
```

Optional: `STRIPE_SECRET_KEY`, `FRONTEND_URL=http://127.0.0.1:5173`.

**Cloud Agent note:** Outbound HTTPS to `api.openai.com` may be blocked in some VMs (SSL/connect errors). Login, queries, and `askAI` reaching OpenAI still prove the stack; full AI replies need egress or run chat tests outside the sandbox.

### Convex CLI offline workaround

If `npx convex dev` fails with “Failed to fetch latest backend version”, start the cached backend manually, then run the CLI watcher in another terminal:

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

1. Start Convex + `npx serve frontend -l 5173`
2. Open `http://127.0.0.1:5173/login.html`, sign in, open dashboard
3. Send a chat message (requires `OPENAI_API_KEY` on Convex **and** outbound access to OpenAI)
