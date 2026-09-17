# PWA 3G Screenshot Fixes — Status

**Date:** 2026-09-17  
**Deploy:** Frontend via Cloudflare Pages CI; Convex via Deploy Convex backend CI

## Files changed

| File | Change |
|------|--------|
| `convex/aiModes.ts` | Giga3 logotype URL → `https://www.giga3ai.com/images/logo.svg` in system prompt |
| `web/public/images/logo.svg` | Brand SVG asset (served at `/images/logo.svg`) |
| `web/styles/globals.css` | Bottom-nav overlap padding, touch targets, active border, media contrast |
| `FIXES_DONE.md` | This verification log |

## Build status

| Step | Result |
|------|--------|
| `cd web && npm run build` | **PASS** (pre-deploy) |

## Fixes applied

### 1. Logo knowledge
System prompt includes:
> Giga3 brand: Logo = https://www.giga3ai.com/images/logo.svg and /images/logo.svg … When asked for logotype URL, return direct URL.

### 2. Bottom nav overlap
- `.primary-nav--mobile` height/padding + scroll container `padding-bottom: 96px`
- `.chat-composer` clearance `margin-bottom: 80px`

### 3. Contrast
- `.btn-media-inactive` (Videos tab), media Back to chat links, `.feed-tab-inactive`

## Verification

- [ ] Ask AI: "What is the Giga3 logo URL?" → `https://www.giga3ai.com/images/logo.svg`
- [ ] `curl -I https://www.giga3ai.com/images/logo.svg` → 200
- [ ] Chat composer not hidden behind bottom nav on mobile
