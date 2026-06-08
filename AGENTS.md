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
- Lint: `npm run lint` (runs `web` ESLint)
- Build: `npm run build` (static export to `web/out`)
- Convex codegen: `npx convex codegen`
- Convex deploy: `npx convex deploy --yes` (requires `CONVEX_DEPLOY_KEY`)

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
- This Cloud Agent VM often **cannot** reach `api.convex.dev` or `*.convex.cloud` (TLS). Use GitHub Actions **Deploy Convex backend** or a local machine for codegen/deploy.
- If CI fails in ~20s at **Deploy to Convex** after key format validation passes, regenerate `CONVEX_DEPLOY_KEY` (`prod:perfect-lark-521|…`) in Convex Dashboard → production → Settings → Deploy key.

### Marketing / landing page stability

- Marketing layout uses **`marketing-stable`** only — do **not** add `pwa-stable-main` on marketing `<main>` (`contain: layout style` on `.saas-card` causes mobile GPU tearing / overlapping cards).
- Header must stay **opaque** (`bg-white`) — no `backdrop-blur` or `bg-white/95` on sticky header.
- On mobile (`max-width: 1023px`), `.marketing-stable` disables transforms, filters, backdrop-filter, and `contain` on all descendants.
- Media studio page keeps its own **`media-stable`** wrapper inside marketing layout.
- After deploy: bump `web/public/sw.js` cache name and hard-refresh / clear PWA cache.

### Chat UI stability

- Chat routes use the `chat-stable` class (`web/app/(app)/chat/layout.tsx`) to disable entrance animations and smooth-scroll jitter.
- **Root shake causes (fixed):** (1) Convex re-emitting new array refs → `useStableUiMessages` / `useStableConversations`; (2) scroll on `isTyping` / `\|typing` anchor → `useScrollToLatestMessage` only when `lastMessageId` changes; typing UI in `ChatTypingBar` outside `MessageList`; (3) mobile `dvh` → chat `fixed inset-0`; (4) `interactiveWidget: overlays-content`; (5) static `TypingIndicator`; (6) workspace `200px` max-height; (7) no pull-to-refresh; (8) chat-stable disables animations/transitions.
- **Phase 1D (split user queries):** Chat uses `users.getChatCredits` + `users.getInterestProfile` in `ChatChrome` / `ChatBanners` / `ChatSidebar` — not `users.getUser` in `useChatPlatform`. Interest profile DB writes are batched every 5 messages (`recordChatInteraction`).
- **After deploy:** hard-refresh or clear PWA service worker cache — stale bundles still contain old scroll loops.
- Render probe: `?renderProbe=1` → `ChatPage`, `ChatShellInner`, `ChatChrome`, `ChatBanners`, `MessageList`, `MessageBubble`, `ChatInput`; 30s delta snapshots in console.
- Dev render probe: `localStorage.giga3_render_probe=1` or `?renderProbe=1` logs `probeRender()` counts in the console.
- **Media studio:** job polling in `RecentGenerationsSection` only; form in `MediaGeneratePanel`. Root uses `min-h-full` (not nested `dvh`). Marketing `main` has `pwa-stable-main`.
- Pull-to-refresh is **disabled** (no custom gesture, no page translate). Use normal navigation or hard refresh if needed.
- Media in messages: URLs in assistant replies render with save/share actions (`MessageMediaBlock`). Chat export: header **Chat actions** menu.

### Frontend HTTP paths (static `frontend/`)

- Mutations: `/mutation/<module>:<name>` (e.g. `users:createUser`)
- Queries: `/query/<module>:<name>` (e.g. `users:getUser`)
- Actions: `/action/<module>:<name>` (e.g. `aiActions:askAI`, `platformActions:sendMessage`, `stripeActions:createCheckout`)
