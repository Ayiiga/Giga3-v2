# Giga3 AI — Cloudflare Pages deployment guide

This document is the canonical checklist for deploying **Giga3-v2** to production.

## Architecture

| Layer | Technology | Hosted on |
|-------|------------|-----------|
| API / DB / AI actions | Convex (`convex/`) | Convex Cloud |
| Marketing + app UI | Next.js 14 static export (`web/`) | Cloudflare Pages project **`giga3ai`** |
| Legacy static UI (optional) | `frontend/` | Not used by current CI workflow |

Production domain (from `frontend/CNAME`): **`www.giga3ai.com`** — attach this custom domain to the **`giga3ai`** Pages project in Cloudflare.

---

## Step-by-step deployment report

### Phase 1 — Convex backend (required)

1. **Install root dependencies** (Convex CLI):
   ```bash
   npm install
   ```
2. **Log in** (once per machine):
   ```bash
   npx convex login
   ```
3. **Deploy functions and schema** from the repository root:
   ```bash
   npx convex deploy
   ```
   Use your **production** Convex deployment (not the anonymous dev deployment).

   **GitHub Actions (recommended):** In the repo → **Settings → Secrets → Actions**, add:

   | Secret | Value |
   |--------|--------|
   | `CONVEX_DEPLOY_KEY` | Production deploy key from Convex → **production** deployment → **Settings → Deploy key**. Must look like `prod:your-deployment-name\|eyJ…` (not `user-…`, not `preview:…`). |

   Pushes to `main` that touch `convex/` run **Deploy Convex backend**. If deploy fails, open the workflow log — the **Validate deploy key** step reports format issues; **Deploy to Convex** prints the last lines of the CLI output.

   Local non-interactive deploy:
   ```bash
   CONVEX_DEPLOY_KEY='prod:…' ./scripts/convex-deploy.sh
   ```

4. **Copy deployment URLs** from the Convex dashboard (Settings → Deployment URLs):
   - **Deployment URL** → `https://<your-deployment>.convex.cloud` (use for `NEXT_PUBLIC_CONVEX_URL`)
   - **HTTP Actions / site URL** → `https://<your-deployment>.convex.site` (optional; `NEXT_PUBLIC_CONVEX_SITE_URL`)

5. **Set Convex environment variables** (Dashboard → Settings → Environment variables, or CLI):

   | Variable | Required | Purpose |
   |----------|----------|---------|
   | `OPENAI_API_KEY` | **Yes** | Chat (`platform.sendMessage`, legacy `ai.askAI`) |
   | `OPENAI_MODEL` | No | Default `gpt-4o-mini` |
   | `OPENAI_FALLBACK_MODEL` | No | Backup OpenAI model in failover |
   | `OPENAI_FALLBACK_API_KEY` | No | Optional second OpenAI key |
   | `GEMINI_API_KEY` | For Gemini failover + media backup | Google AI Studio key |
   | `GEMINI_MODEL` | No | Default `gemini-2.5-flash` |
   | `GEMINI_IMAGE_MODEL` | No | Imagen backup for text-to-image, default `imagen-4.0-fast-generate-001` |
   | `GEMINI_IMAGE_EDIT_MODEL` | No | Gemini backup for editing + Imagen fallback, default `gemini-2.5-flash-image` |
   | `FAL_KEY` or `FAL_API_KEY` | For fal.ai failover | fal.ai dashboard |
   | `FAL_MODEL` | No | Chat LLM on fal OpenRouter / any-llm, default `google/gemini-2.5-flash` |
   | `FAL_IMAGE_MODEL` | No | Image model, default `fal-ai/nano-banana-pro` (see fal.ai docs) |
   | `REPLICATE_API_TOKEN` | For media | Image/video generation |
   | `REPLICATE_IMAGE_MODEL` | No | Default in `mediaCatalog.ts` |
   | `REPLICATE_VIDEO_MODEL` | No | Default in `mediaCatalog.ts` |
   | `PAYSTACK_SECRET_KEY` | For billing | Paystack server API |
   | `PAYSTACK_PREMIUM_GHS` | No | Default `49` |
   | `PAYSTACK_CREDITS_60_GHS` | No | Default `60` (grants same number of credits) |
   | `PAYSTACK_CREDITS_150_GHS` | No | Default `150` |
   | `PAYSTACK_CREDITS_500_GHS` | No | Default `500` |
   | `FRONTEND_URL` | **Yes (prod)** | Paystack/Stripe redirects, e.g. `https://www.giga3ai.com` |
   | `STRIPE_SECRET_KEY` | Legacy only | Old token checkout in `payments.ts` |

   ```bash
   npx convex env set OPENAI_API_KEY "sk-..."
   npx convex env set FRONTEND_URL "https://www.giga3ai.com"
   npx convex env set PAYSTACK_SECRET_KEY "sk_live_..."
   ```

6. **Configure Convex auth / CORS** (if needed): allow your Pages origin (`https://www.giga3ai.com`, `https://giga3ai.pages.dev`) in the Convex dashboard.

---

### Phase 2 — GitHub repository secrets

Add these under **Settings → Secrets and variables → Actions → Repository secrets**:

| Secret | Required | Value / notes |
|--------|----------|----------------|
| `CF_API_TOKEN` | **Yes** | Cloudflare API token with **Account → Cloudflare Pages → Edit** |
| `CF_ACCOUNT_ID` | **Yes** | Cloudflare account ID (dashboard URL or API) |
| `NEXT_PUBLIC_CONVEX_URL` | **Yes** | Production Convex URL, e.g. `https://<deployment>.convex.cloud` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Recommended | `https://<deployment>.convex.site` (exported for future use; not required by current UI) |
| `NEXT_PUBLIC_GIGA3_DATA_BACKEND` | Recommended | `supabase` to store chat/media history in Supabase while Convex remains active for AI/media/billing |
| `NEXT_PUBLIC_SUPABASE_URL` | Required for Supabase mode | `https://bgkkrezloideuwfwkloz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required for Supabase mode | Supabase anon public key for project `bgkkrezloideuwfwkloz` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Recommended | Paystack Inline popup (`pk_live_…`); fallback: Convex `PAYSTACK_PUBLIC_KEY` via `paystack.getClientConfig` |
| ~~`CF_PROJECT_NAME`~~ | **Not used** | Workflow deploys to hardcoded project **`giga3ai`** |

**`CF_PROJECT_NAME` confirmation:** the Cloudflare Pages project name must be **`giga3ai`**. The GitHub workflow sets `projectName: giga3ai` explicitly so the secret is not required.

---

### Phase 3 — Cloudflare Pages project

1. In Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** *or* rely on GitHub Actions upload only (this repo uses **Actions → `cloudflare/pages-action`** to upload `web/out`).
2. Ensure a Pages project named **`giga3ai`** exists (create it if missing).
3. **Custom domain:** add `www.giga3ai.com` (and optionally apex `giga3ai.com`) to project **`giga3ai`**.
4. If you also connect the GitHub repo in the Cloudflare UI, **disable** duplicate builds or use only one deploy path to avoid conflicting uploads.

**Equivalent manual build settings** (if building in Cloudflare UI instead of Actions):

| Setting | Value |
|---------|--------|
| Root directory | `/` (repo root) |
| Build command | `cd web && npm install && npm run build` |
| Build output directory | `web/out` |
| Node.js version | `20` |
| Environment variables | Same `NEXT_PUBLIC_*` as GitHub secrets |

---

### Phase 4 — Deploy via GitHub Actions

1. Push to **`main`** (or run workflow **Deploy to Cloudflare Pages** manually).
2. Workflow file: `.github/workflows/pages.yml`
3. Steps: validate secrets → `npm install` in `web/` → `npm run lint` → `npm run build` → upload **`web/out`** to project **`giga3ai`**.
4. Confirm the run in **Actions** tab; site URL will be `https://giga3ai.pages.dev` (plus custom domain).

---

### Phase 5 — Post-deploy verification

- [ ] `https://www.giga3ai.com/` loads marketing home
- [ ] `/chat/login/` — sign in works (localStorage email)
- [ ] `/chat/` — send message (needs `OPENAI_API_KEY` on Convex)
- [ ] `/pricing/`, `/subscribe/`, `/credits/` — Paystack flow (needs `PAYSTACK_SECRET_KEY`, `FRONTEND_URL`)
- [ ] `/media/` — image job (needs `REPLICATE_API_TOKEN`)
- [ ] PWA: `manifest.webmanifest`, `sw.js` served (see `web/public/_headers`)

---

## Next.js build configuration

`web/next.config.mjs`:

- `output: "export"` — static HTML export for Cloudflare Pages
- `trailingSlash: true` — compatible with static hosting
- `images.unoptimized: true` — required for static export

`web/package.json` scripts:

- `prebuild` → `node scripts/generate-icons.mjs`
- `build` → `next build` → output in **`web/out/`**

---

## Client environment variables (baked in at build time)

Set in GitHub Actions (or `web/.env.local` for local production builds):

| Variable | Used in | Notes |
|----------|---------|--------|
| `NEXT_PUBLIC_CONVEX_URL` | `web/lib/convex/env.ts` | **Required** — Convex client URL (`.convex.cloud`) |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `web/lib/convex/env.ts` | Optional — HTTP actions URL (`.convex.site`) |
| `NEXT_PUBLIC_GIGA3_DATA_BACKEND` | `web/lib/dataBackend.ts` | `supabase` switches chat/media history reads and writes to Supabase |
| `NEXT_PUBLIC_SUPABASE_URL` | `web/lib/supabase.ts` | Required when data backend is `supabase` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `web/lib/supabase.ts` | Required when data backend is `supabase` |

**Convention:** This repo is Next.js only. Do **not** use `EXPO_PUBLIC_CONVEX_*` — those names are not read by the app.

### Cloudflare Pages environment variables

If Cloudflare **builds** the site (not only uploads `web/out` from GitHub Actions), set the same names in the Pages project → **Settings → Environment variables** (Production):

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://perfect-lark-521.convex.cloud` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://perfect-lark-521.convex.site` |
| `NEXT_PUBLIC_GIGA3_DATA_BACKEND` | `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bgkkrezloideuwfwkloz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |

When deploy uses **GitHub Actions** (this repo’s default), variables are injected in `.github/workflows/pages.yml` at build time; Cloudflare only hosts static files from `web/out` and does not need them unless you add a CF-native build.


Do **not** put `OPENAI_API_KEY` in the Next.js app — it belongs only on Convex.

---

## GitHub Actions: Convex deploy

Workflow: `.github/workflows/convex-deploy.yml`

**Triggers:** push to `main` when `convex/**`, `package.json`, or the workflow file changes; or **Run workflow** manually.

**Required GitHub secret:** `CONVEX_DEPLOY_KEY` — production deploy key (`prod:perfect-lark-521|eyJ…`).

**Optional secrets** (synced after deploy): `OPENAI_API_KEY`, `GEMINI_API_KEY`, `FAL_KEY`.

The job applies `CHAT_*` latency defaults after each successful deploy.

---

## Known blockers and fixes

| Blocker | Impact | Fix |
|---------|--------|-----|
| Missing `NEXT_PUBLIC_CONVEX_URL` in CI | Build succeeds but app shows “Set NEXT_PUBLIC_CONVEX_URL” | Add GitHub secret; rebuild |
| Convex not deployed | Chat/media/billing API 404 | Run `npx convex deploy` |
| Wrong `FRONTEND_URL` on Convex | Paystack return URLs broken | `npx convex env set FRONTEND_URL https://www.giga3ai.com` |
| No `web/package-lock.json` | Slower CI; `npm ci` skipped | Run `cd web && npm install` locally and commit lockfile |
| Pages project name ≠ `giga3ai` | Deploy action fails | Rename project or change `projectName` in workflow |
| Duplicate Cloudflare Git integration + Actions | Double deploys / overwrites | Use one deploy method |
| Outdated README (`frontend/` deploy) | Confusion | See updated root `README.md` |

---

## Quick reference commands

```bash
# Backend
npm install
npx convex deploy

# Frontend (local production build)
cd web && npm install
export NEXT_PUBLIC_CONVEX_URL="https://YOUR_DEPLOYMENT.convex.cloud"
npm run lint && npm run build
# Static files: web/out/
```

## Chat latency (mobile / African networks)

Convex env (optional):

- `CHAT_PROVIDER_TIMEOUT_MS` — per-provider timeout (default `22000`)
- `CHAT_MAX_TOKENS` — shorter replies, faster download (default `1024`)
- `CHAT_MAX_HISTORY_TURNS` — trim context (default `12`)
- `CHAT_ENABLE_FAL` — set `false` to skip slow fal chat fallback (recommended)

Gemini + OpenAI are raced in parallel; fal queue LLM is not used for chat.


## Chat error: Could not find users:getUser

This means production Convex never received the latest functions (deploy CI is failing).

1. Open [Actions → Deploy Convex backend](https://github.com/Ayiiga/Giga3-v2/actions/workflows/convex-deploy.yml)
2. Open the latest failed run → **Summary** for the error tail
3. Regenerate deploy key: Convex dashboard → **perfect-lark-521** → Settings → Deploy key → `prod:perfect-lark-521|…`
4. Set GitHub secret **CONVEX_DEPLOY_KEY** (repository secrets or environment **CF_ACCOUNT_ID**)
5. Re-run the workflow on `main`

After a green deploy, refresh https://www.giga3ai.com/chat — `users:getUser` and `platformActions:sendMessage` will be available.
