# AGENTS.md

## Cursor Cloud specific instructions

### Services

| Service | Path | Notes |
|---------|------|--------|
| Convex backend | `convex/` | Deploy via CI or `npx convex deploy` — see `DEPLOYMENT.md` |
| Replicate video (backup) | `convex/replicateClient.ts` | Default `bytedance/seedance-2.0` — text-to-video, optional first-frame image, synced audio |
| Replicate image (backup) | `convex/replicateClient.ts` | `flux-schnell` generation; `flux-kontext-pro` when `sourceImageUrl` / `?source=` edit links |
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

### Premium UI / themes

- Chat uses **`ThemeProvider`** (`web/components/providers/ThemeProvider.tsx`) — `dark` class on `<html>`, not hardcoded on chat layout.
- **Giga3 model tiers** (Fast/Smart/Vision/Creator) map to existing Convex `mode` ids in `web/lib/chat/gigaModels.ts` — no new backend schema.
- Image Studio deep links from chat: `web/lib/chat/imageStudioLinks.ts` → `/media?…` (`source` URL enables edit mode → Google AI Studio backup via `convex/geminiImageClient.ts`)
- **Media image failover:** fal.ai → Replicate → Google AI Studio (`GEMINI_API_KEY`; Imagen for generation, Gemini for edit-with-source)
- Voice dictation uses browser `SpeechRecognition`; `_headers` allows `microphone=(self)`.
- Keep **`chat-stable`** on chat layout; avoid backdrop-blur on sticky marketing header.

### Marketing / landing page stability

- Marketing layout uses **`marketing-stable`** only — do **not** add `pwa-stable-main` on marketing `<main>` (`contain: layout style` on `.saas-card` causes mobile GPU tearing / overlapping cards).
- Header must stay **opaque** (`bg-white`) — no `backdrop-blur` or `bg-white/95` on sticky header.
- On mobile (`max-width: 1023px`), `.marketing-stable` disables transforms, filters, backdrop-filter, and `contain` on all descendants.
- Media studio page keeps its own **`media-stable`** wrapper inside marketing layout.
- After deploy: bump `web/public/sw.js` cache name and hard-refresh / clear PWA cache.

### Chat UI stability

- Chat routes use the `chat-stable` class (`web/app/(app)/chat/layout.tsx`) to disable entrance animations and smooth-scroll jitter.
- **Root shake causes (fixed):** (1) Convex re-emitting new array refs → `useStableUiMessages` / `useStableConversations`; (2) scroll on `messageListScrollKey` only (not `isSending` / typing) — typing bar always reserves height in `ChatTypingBar`; (3) mobile `dvh` removed from chat login/error — shell uses `fixed inset-0` + `h-full`; (4) `interactiveWidget: overlays-content`; (5) static `TypingIndicator`; (6) workspace auto-collapses when chat has messages; (7) no pull-to-refresh; (8) chat-stable disables animations/transitions; mobile also disables `transform`/`contain` (mirror `marketing-stable`); (9) `chat-message-bubble` uses `contain: none`; (10) composer textarea uses fixed `max-h-40` scroll (no JS height resize).
- **Phase 1D (split user queries):** Chat uses `users.getChatCredits` + `users.getInterestProfile` in `ChatChrome` / `ChatBanners` / `ChatSidebar` — not `users.getUser` in `useChatPlatform`. Interest profile DB writes are batched every 5 messages (`recordChatInteraction`).
- **After deploy:** hard-refresh or clear PWA service worker cache — stale bundles still contain old scroll loops.
- Render probe: `?renderProbe=1` → `ChatPage`, `ChatShellInner`, `ChatChrome`, `ChatBanners`, `MessageList`, `MessageBubble`, `ChatInput`; 30s delta snapshots in console.
- Dev render probe: `localStorage.giga3_render_probe=1` or `?renderProbe=1` logs `probeRender()` counts in the console.
- **Media studio:** job polling in `RecentGenerationsSection` only; form in `MediaGeneratePanel`. Root uses `min-h-full` (not nested `dvh`). Marketing `<main>` does not use `pwa-stable-main`.
- **Mobile chat layout:** `chat/layout` + `(app)/layout` use `flex-1 min-h-0 overflow-hidden` height chain; `ChatConversationPane` owns scroll + composer dock. Messages use ChatGPT-style alignment (`justify-end` user / `justify-start` assistant) — not `flex-row-reverse`. Workspace panel `hidden sm:block` when chat has messages. Assistant bubble uses `--bubble-assistant` bg on mobile.
- Pull-to-refresh is **disabled** (no custom gesture, no page translate). Use normal navigation or hard refresh if needed.
- Media in messages: URLs in assistant replies render with save/share actions (`MessageMediaBlock`). Chat export: header **Chat actions** menu.

### Frontend HTTP paths (static `frontend/`)

- Mutations: `/mutation/<module>:<name>` (e.g. `users:createUser`)
- Queries: `/query/<module>:<name>` (e.g. `users:getUser`)
- Actions: `/action/<module>:<name>` (e.g. `aiActions:askAI`, `platformActions:sendMessage`, `stripeActions:createCheckout`)
