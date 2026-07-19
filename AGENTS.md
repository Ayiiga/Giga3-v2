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
| Supabase (optional) | `web/lib/supabase/` | Chat/media history when `NEXT_PUBLIC_GIGA3_DATA_BACKEND=supabase` |

### Dual backend (Convex + Supabase)

Giga3 uses **both** Convex and Supabase in production-capable configs:

- **`NEXT_PUBLIC_GIGA3_DATA_BACKEND=convex`** (default): chat history + AI in Convex (`useChatPlatform`).
- **`NEXT_PUBLIC_GIGA3_DATA_BACKEND=supabase`**: chat history in Supabase, but **AI send/reply still goes through Convex HTTP** (`useSupabaseChatPlatform` → `chatMessaging:acceptMessage`). Convex also handles billing, media jobs, Paystack.

When fixing chat reliability on slow mobile networks, update **both** `web/hooks/useChatPlatform.ts` and `web/hooks/useSupabaseChatPlatform.ts`, plus shared timings in `web/lib/chat/chatNetwork.ts`.

### Commands

**Install (repo root):**

- `npm ci --legacy-peer-deps`
- `cd web && npm install --legacy-peer-deps`

**Lint / build (run from `web/`, or set `working-directory: web` like CI):**

- `npm run lint` — ESLint via `next lint`
- `npm run build` — static export to `web/out`
- `npm run verify:convex-env` — confirms `out/` embeds `NEXT_PUBLIC_CONVEX_URL` (set env when running)

**Convex (repo root):**

- `npx convex codegen` — requires `CONVEX_DEPLOYMENT` (from `npx convex dev` or `.env.local` with deploy key); committed `convex/_generated/` is usually enough for frontend work
- `npx convex deploy --yes` — requires `CONVEX_DEPLOY_KEY`

**Dev server:** `cd web && npm run dev` → http://localhost:3000 (copy `web/.env.local.example` → `web/.env.local` with Convex URLs)

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
- If `npx convex codegen` / `deploy` fail with TLS or auth errors from the VM, use GitHub Actions **Deploy Convex backend** or a local machine. Production HTTP queries (e.g. `users:getUser`) work when `NEXT_PUBLIC_CONVEX_URL` points at `perfect-lark-521`.
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
