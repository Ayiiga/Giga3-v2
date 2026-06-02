# Giga3 AI — Next.js Web

Marketing site + **ChatGPT-style chat platform** (Next.js 14, App Router, TypeScript, Tailwind).

## Chat platform (`/chat`)

- Sidebar with conversation history, new chat, delete
- Tool selector with 10 AI modes (see `lib/aiRouter.ts`)
- User / assistant bubbles, typing indicator, auto-scroll
- Persistence via **Convex** (`conversations` + `messages` tables)
- OpenAI via `OPENAI_API_KEY` (Convex action + optional `/api/chat` route)

### Run locally

```bash
# Terminal 1 — Convex (repo root)
npm install
npx convex dev

# Terminal 2 — Next.js
cd web
cp .env.local.example .env.local   # set NEXT_PUBLIC_CONVEX_URL + OPENAI_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000/chat/login](http://localhost:3000/chat/login).

### Architecture

| Layer | Path | Role |
|-------|------|------|
| UI | `app/chat/`, `components/chat/` | ChatGPT-style interface |
| Router | `lib/aiRouter.ts` | Mode definitions & prompt assembly |
| OpenAI | `lib/openai.ts` | Client singleton (env vars) |
| Providers | `lib/ai/providers/` | Pluggable backends (`openai` today) |
| API | `app/api/chat/route.ts` | Standalone HTTP chat (no Convex storage) |
| Backend | `convex/platform.ts` | `sendMessage` action + storage |

Keep `convex/aiModes.ts` in sync with `lib/aiRouter.ts` mode ids.

### Environment

```env
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
AI_PROVIDER=openai
```

## Marketing site

Static-friendly landing at `/`. Build:

```bash
npm run build
```

For Cloudflare Pages with API routes, use `@cloudflare/next-on-pages` or deploy to Node/Vercel.
