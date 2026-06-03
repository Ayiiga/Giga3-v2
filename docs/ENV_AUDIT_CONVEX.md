# Convex client environment variable audit

**Date:** 2026-06-03  
**Standard:** `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` only (Next.js 14 static export in `web/`).

## Summary

| Location | Before | After |
|----------|--------|--------|
| `web/lib/convex/env.ts` | `NEXT_PUBLIC_*` with `EXPO_PUBLIC_*` fallbacks | `NEXT_PUBLIC_*` only |
| `.github/workflows/pages.yml` | `NEXT_PUBLIC_*` | Unchanged (already correct) + post-build verify script |
| Cloudflare Pages (docs) | Mixed / unclear | Documented `NEXT_PUBLIC_*` for CF-native builds |
| `frontend/` (legacy) | Hardcoded `GIGA3_CONFIG.CONVEX_URL` | Unchanged — not part of Next app; CI deploys `web/out` only |
| Convex dashboard | `OPENAI_API_KEY`, etc. | Unrelated to client URL prefix |

## Code references

| File | Variables |
|------|-----------|
| `web/lib/convex/env.ts` | `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL` |
| `web/lib/convex.ts` | Uses `getConvexUrl()` → `ConvexReactClient` |
| `web/components/providers/ConvexClientProvider.tsx` | `getConvexUrl()` at runtime |
| `web/.env.local.example` | `NEXT_PUBLIC_*` |
| `.github/workflows/pages.yml` | Secrets → build `env` |

## Mismatches found (resolved)

1. **Dual convention in `env.ts`** — Expo fallbacks could hide a missing `NEXT_PUBLIC_CONVEX_URL` if only Expo vars were set in an environment. Removed Expo support; app is not Expo.
2. **DEPLOYMENT.md** listed `EXPO_PUBLIC_*` as supported — removed; clarified Next-only convention.
3. **No build-time verification** — Added `web/scripts/verify-convex-in-build.mjs` and CI step to fail if `out/` does not contain the Convex deployment host.

## Production build verification

CI runs after `npm run build`:

```bash
node scripts/verify-convex-in-build.mjs
```

Requires `NEXT_PUBLIC_CONVEX_URL` and checks that `web/out` contains the deployment hostname.

Local check:

```bash
cd web
export NEXT_PUBLIC_CONVEX_URL="https://perfect-lark-521.convex.cloud"
npm run build && npm run verify:convex-env
```

## GitHub Actions secrets (required)

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CONVEX_SITE_URL` (optional but recommended)

## Cloudflare Pages

- **Deploy via Actions:** secrets only in GitHub; no CF build env required.
- **Build on Cloudflare:** set `NEXT_PUBLIC_CONVEX_URL` and optionally `NEXT_PUBLIC_CONVEX_SITE_URL` in the Pages project environment (Production).

## Not used for the Next.js client

- `EXPO_PUBLIC_CONVEX_URL` / `EXPO_PUBLIC_CONVEX_SITE_URL`
- `CONVEX_URL` in Convex dashboard (server-side; different from `NEXT_PUBLIC_*`)
- Legacy `frontend/assets/js/config.js` `GIGA3_CONFIG.CONVEX_URL` (static HTML MVP only)
