# Giga3 AI — MVP

This repo contains a minimal production-ready MVP using Convex (TypeScript) backend and a pure HTML/CSS/JS frontend.

Quick features
- Email-based mock auth (localStorage)
- Chat UI (mobile-first, dark, glassmorphism)
- Convex `askAI` action: creates user, checks tokens, saves chats, calls OpenAI, stores AI reply, deducts tokens

Setup (local/dev)
1. Install deps:

```bash
npm install
```

2. Set your OpenAI API key as a Convex secret or env when running Convex locally.

For Convex Cloud, set the `OPENAI_API_KEY` secret in your Convex project settings.

4. Optionally set `STRIPE_SECRET_KEY` and `FRONTEND_URL` in Convex Cloud for Stripe token purchases. The app will use `https://www.giga3ai.com` as the default frontend redirect if `FRONTEND_URL` is not configured.

5. Run Convex locally for development:

```bash
npx convex dev
```

6. Update `frontend/assets/js/config.js` with your deployed Convex Cloud URLs when deploying the frontend. The current repo is already configured for `https://perfect-lark-521.convex.cloud`.

Deploy

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full Cloudflare Pages checklist.

1. `npx convex deploy` — backend (from repo root).
2. Push to `main` — GitHub Actions builds `web/` and deploys **`web/out`** to Cloudflare Pages project **`giga3ai`**.
3. Custom domain: `www.giga3ai.com` (see `frontend/CNAME`).

GitHub Actions secrets: `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `NEXT_PUBLIC_CONVEX_URL` (and optionally `NEXT_PUBLIC_CONVEX_SITE_URL`). Convex secrets (`OPENAI_API_KEY`, `PAYSTACK_SECRET_KEY`, `FRONTEND_URL`, etc.) are set on Convex, not in the Next.js build.

The legacy `frontend/` folder is not deployed by CI; the production app is **`web/`** (Next.js static export).

Notes
- Do NOT put `OPENAI_API_KEY` in frontend — it's used only server-side in Convex.
- The OpenAI model used is `gpt-4o-mini`.
- Update `frontend/assets/js/config.js` with your actual Convex endpoint after deploying Convex.

Files changed/added
- [convex/schema.ts](convex/schema.ts)
- [convex/ai.ts](convex/ai.ts)
- [convex/chat.ts](convex/chat.ts)
- [convex/users.ts](convex/users.ts)
- [convex/payments.ts](convex/payments.ts)
- [frontend/index.html](frontend/index.html)
- [frontend/login.html](frontend/login.html)
- [frontend/dashboard.html](frontend/dashboard.html)
- [frontend/pricing.html](frontend/pricing.html)
- [frontend/assets/css/style.css](frontend/assets/css/style.css)
- [frontend/assets/js/config.js](frontend/assets/js/config.js)
- [frontend/assets/js/auth.js](frontend/assets/js/auth.js)
- [frontend/assets/js/chat.js](frontend/assets/js/chat.js)
- [frontend/assets/js/payments.js](frontend/assets/js/payments.js)

If you want, I can:
- Deploy Convex functions and provide the Cloud URL (requires your Convex account)
- Wire Cloudflare Pages config for deployment
"# Giga3-v2" 
