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
- Deploy Convex functions with `npx convex deploy`.
- Deploy `frontend/` to Cloudflare Pages (connect repo or upload files).
- The included workflow at `.github/workflows/pages.yml` will build and publish the `frontend/` folder.

Environment
- `OPENAI_API_KEY` for OpenAI calls
- `FAL_KEY` (or `FAL_API_KEY`) for fal.ai image and video generation
- `FAL_VIDEO_MODEL` (optional, default `nvidia/cosmos-3-super/image-to-video`)
- `FAL_IMAGE_MODEL` (optional, default `fal-ai/nano-banana-pro`)
- `STRIPE_SECRET_KEY` for Stripe Checkout payments
- `FRONTEND_URL` for redirecting Stripe success/cancel pages
- `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_PROJECT_NAME` if using GitHub Actions for Cloudflare Pages

Media (fal.ai)
- Convex actions: `media:generateVideo` (Cosmos3 Super image-to-video), `media:generateImage`
- UI: [frontend/media.html](frontend/media.html) — requires first-frame `imageUrl` + motion `prompt` for video
- Quick env setup: `FAL_KEY=... ./scripts/convex-env-ai-providers.sh`

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
