# Giga3 AI — Deployment

## Stack

| Layer | Service |
|-------|---------|
| Backend | [Convex](https://convex.dev) (`convex/`) |
| Web app | Next.js 14 static export (`web/out`) |
| Hosting | Cloudflare Pages (GitHub Actions) |
| Payments | Paystack (GHS), legacy Stripe token checkout |

## GitHub

1. Merge the production branch into `main`.
2. Add repository secrets for the workflow in `.github/workflows/pages.yml`:
   - `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_PROJECT_NAME`
   - `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`
   - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` (optional; billing UI)
3. Push to `main` to trigger the Cloudflare Pages deploy.

## Cloudflare Pages

The workflow builds `web/` with `output: "export"` and uploads `web/out`.

Build command (manual): `cd web && npm install && npm run build`  
Output directory: `web/out`

## Convex

```bash
npx convex deploy
```

Set deployment environment variables in the Convex dashboard:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Chat (platform + legacy `ai.askAI`) |
| `OPENAI_MODEL` | Optional model override |
| `REPLICATE_API_TOKEN` | Image/video generation |
| `REPLICATE_IMAGE_MODEL`, `REPLICATE_VIDEO_MODEL` | Optional model IDs |
| `PAYSTACK_SECRET_KEY` | Paystack initialize/verify |
| `PAYSTACK_PREMIUM_GHS`, `PAYSTACK_CREDITS_*_GHS` | Plan amounts |
| `FRONTEND_URL` | Checkout redirect base (e.g. `https://www.giga3ai.com`) |
| `STRIPE_SECRET_KEY` | Legacy Stripe token purchases only |

## Local development

```bash
npm install
npx convex dev
cd web && npm install && npm run dev
```

Copy `web/.env.local.example` to `web/.env.local` and set `NEXT_PUBLIC_CONVEX_URL`.
