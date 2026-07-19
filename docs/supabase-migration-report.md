# Supabase migration report

## Summary

Supabase is integrated as an opt-in data backend for Giga3-v2 while Convex remains the default production backend. Set `NEXT_PUBLIC_GIGA3_DATA_BACKEND=supabase` only after applying the Supabase migration, configuring Supabase Auth, and running the Convex export importer.

## Dual backend mode: Convex + Supabase

- Convex remains active for AI chat execution, media generation execution, Paystack billing, subscription/credit fulfillment, and legacy frontend compatibility.
- Supabase is the migration target for durable app data: users, chat history, media generation history, payments, token transactions, and storage buckets.
- `NEXT_PUBLIC_GIGA3_DATA_BACKEND` controls the client data-history path. Use `convex` for the current production fallback or `supabase` after the Supabase schema/env/data import has been verified.
- During migration, Supabase chat history can mirror Convex AI responses while Convex continues to run the provider actions.

## Changed files

- `supabase/config.toml` — records linked project ref `bgkkrezloideuwfwkloz`.
- `supabase/migrations/20260605132000_giga3_initial_schema.sql` — creates `users`, `chats`, `chat_messages`, `generations`, `payments`, `token_transactions`, storage buckets, indexes, triggers, and RLS policies.
- `scripts/migrate-convex-to-supabase.mjs` — imports Convex export data into Supabase using `SUPABASE_SERVICE_ROLE_KEY`.
- `scripts/verify-supabase-project.mjs` — verifies Supabase env points at project ref `bgkkrezloideuwfwkloz` and attempts a REST read.
- `package.json` — adds `npm run supabase:migrate:convex` and `npm run supabase:verify`.
- `web/.env.local.example` — documents Supabase URL/key/env and the backend feature flag.
- `web/types/supabase.ts` — typed database access model for Supabase tables.
- `web/lib/supabase.ts` — typed browser Supabase REST/Auth client.
- `web/lib/supabase/server.ts` — server-side Supabase client factory with service-role support.
- `web/lib/supabase/auth.ts` — Supabase magic-link auth helpers and local email sync.
- `web/lib/supabase/data.ts` — typed Supabase CRUD helpers for users, chats, messages, generations, payments, and token transactions.
- `web/lib/supabase/storage.ts` — storage bucket names, public URL generation, upload, and removal helpers.
- `web/lib/dataBackend.ts` — feature flag helper for `convex` vs `supabase`.
- `web/components/chat/ChatLoginForm.tsx` — supports Supabase magic links and uses Convex HTTP for legacy user creation.
- `web/components/chat/ChatLoginPageClient.tsx` — removes the Convex React provider requirement from login.
- `web/components/chat/ChatShell.tsx` — selects Convex or Supabase chat platform by feature flag and passes stable props.
- `web/components/chat/ChatChrome.tsx` — receives credits from the platform hook and supports Supabase sign-out.
- `web/components/chat/ChatSidebar.tsx` — supports string IDs, receives credits from the platform hook, and is memoized.
- `web/components/chat/ChatBanners.tsx` — receives interest profile data from the platform hook instead of subscribing itself.
- `web/hooks/useChatPlatform.ts` — centralizes Convex chat credits and interest profile subscriptions.
- `web/hooks/useSupabaseChatPlatform.ts` — adds Supabase chat history with Convex HTTP AI execution during migration.
- `web/hooks/usePolledMediaJobs.ts` — removes idle media polling and reads Supabase generations when flagged.
- `web/hooks/useMediaGeneration.ts` — mirrors completed media generations to Supabase when flagged.
- `web/lib/chat/stableConversations.ts` — includes mirrored Convex conversation IDs in stable comparisons.

## How to migrate data

1. Apply the Supabase migration:
   - `supabase db push`
2. Export Convex data to a local directory.
3. Run a dry run:
   - `npm run supabase:migrate:convex -- --dir ./convex-export --dry-run`
4. Run the import:
   - `SUPABASE_URL=https://bgkkrezloideuwfwkloz.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run supabase:migrate:convex -- --dir ./convex-export`

The importer preserves Convex IDs in `convex_*` columns so records can be reconciled or re-run idempotently.

## Remaining Convex dependencies

Convex intentionally remains operational for these paths during migration:

- Chat AI execution: `platformActions:sendMessage`, `conversations:create`, `messages:listByConversation`.
- Media generation execution: `media.generateImage`, `media.generateVideo`.
- Billing and usage: `credits.getUsageSnapshot`, Paystack actions, Paystack webhook fulfillment, subscriptions, and credit grants.
- Legacy static site APIs in `frontend/`: `users`, `chat`, `aiActions`, `mediaFal`, and Stripe/Paystack compatibility endpoints.
- Convex deployment/env remains required until AI/media/billing server actions are moved to Supabase-backed infrastructure.

## Missing or blocked environment items

- `NEXT_PUBLIC_SUPABASE_URL` — required for Supabase mode. Provided value should point at `https://bgkkrezloideuwfwkloz.supabase.co`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required for browser Supabase mode. The verification script confirms its JWT `ref` claim is `bgkkrezloideuwfwkloz`.
- `SUPABASE_SERVICE_ROLE_KEY` — required only for server-side import/admin migration commands.
- `@supabase/supabase-js` — requested SDK dependency, but this Cloud VM could not install it because npm registry requests failed with `ECONNRESET`. The current implementation uses typed Supabase HTTP APIs so builds stay passing until package installation is available.

## Stability changes

- Chat credits and interest profile are read once in the platform hook and passed into child components.
- `ChatSidebar` is memoized and receives stable callbacks from `ChatShell`.
- `ChatBanners` is pure and no longer opens a Convex subscription.
- Recent media generations no longer run an idle interval; polling only runs while a job is actively processing.
- Supabase chat mode uses explicit fetch/refresh instead of realtime subscriptions.

