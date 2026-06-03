## Cursor Cloud specific instructions

### Services

| Service | Purpose | How to run |
|---------|---------|------------|
| Convex backend | API (`users:getUser`, chat, media, billing) | Deploy only — see `DEPLOYMENT.md` and `.github/workflows/convex-deploy.yml` |
| `frontend/` | Static Cloudflare Pages app | Served by Pages in prod; local static server optional |
| `web/` | Next.js app | `npm run dev --prefix web` (needs `NEXT_PUBLIC_CONVEX_URL`) |

### Convex deploy (production)

- Production URL: `https://perfect-lark-521.convex.cloud` (see `frontend/assets/js/config.js`).
- `users:getUser` is defined in `convex/users.ts` as a **public query**. If the client reports it is missing, production has not received a successful deploy — not a missing export in git.
- This Cloud Agent VM **cannot** reach `api.convex.dev` or `*.convex.cloud` (TLS errors). Use **GitHub Actions** “Deploy Convex backend” or a local machine for `npx convex codegen` / `npx convex deploy --yes`.
- CI validates `CONVEX_DEPLOY_KEY` format (`prod:deployment-name|token`). If deploy still fails in ~20s at “Deploy to Convex”, regenerate the key in Convex Dashboard → production deployment → Settings → Deploy key and update the GitHub secret.

### Frontend HTTP paths (static `frontend/`)

- Mutations: `/mutation/<module>:<name>` (e.g. `users:createUser`)
- Queries: `/query/<module>:<name>` (e.g. `users:getUser`)
- Actions: `/action/<module>:<name>` (e.g. `aiActions:askAI`, `platformActions:sendMessage`, `stripeActions:createCheckout`)

### Lint / test

- Root: `npm run lint` → runs `web` ESLint.
- Web build: `npm run build` (requires `web` dependencies installed).
