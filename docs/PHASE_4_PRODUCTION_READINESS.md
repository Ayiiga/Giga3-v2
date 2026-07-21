# Phase 4 — Production Readiness Plan

**Status:** Implementation in progress (split PRs)  
**Goal:** Harden Giga3 AI PWA for large-scale usage without UX/architecture rewrites.  
**Constraint:** Preserve auth, AI Chat, GigaSocial, Marketplace, Wallet, AI Studio, Camera, Teleprompter, Uploads, Search, Notifications, API v1.

---

## Audit summary (current state)

| Area | Exists today | Primary gap |
|------|--------------|-------------|
| Security headers / CSP | `web/public/_headers` (HSTS, CSP, COOP/CORP) | Keep; tighten only where safe for static export |
| Auth rate limits | `convex/authRateLimit.ts`, AI limits | Social write mutations unthrottled |
| Upload validation | `convex/gigaSocialStorage.ts`, `attachmentValidation.ts` | Stronger filename/extension blocking; abuse events |
| Reliability | Chat outbox, feed snapshots, chat/media error boundaries | App-route error boundary; shared retry helper docs |
| SW / offline | Precache shell; sensitive paths excluded | Bump cache → **v170** safely |
| Observability | `securityMonitoring.ts`, quality dashboard | Admin UI wiring for security events |
| Admin | Users, marketplace, social economy | Security health panel |
| Backup / DR | Chat recovery helpers | Operator runbook missing |
| CI | Lint + chat-overflow Playwright on Pages deploy | **Vitest not gated on PRs** |
| Performance | `memo`, dynamic imports, LazyFeedItem (Phase 3) | Virtualization remains optional / flag-gated follow-up |

---

## Non-goals (explicit)

- No auth flow rewrite / no cookie migration in Phase 4 (localStorage session retained)
- No API v1 breaking changes
- No schema-breaking migrations
- No pull-to-refresh re-enable
- No full chat/feed virtualization in first wave (optional follow-up behind flag)
- Do not flip `ignoreBuildErrors` until CI is green and debt is tracked

---

## Delivery: four small PRs

### PR-A — CI quality gate + this plan
**Branch:** `cursor/phase4-ci-vitest-gate-bde5`  
**Changes:**
- Add `.github/workflows/ci-test.yml` running `npm ci` + `npm test` (Vitest) on PR/`main`
- Optionally add Vitest step to Pages workflow before build
- Commit this plan doc

**Rollback:** Delete workflow / revert doc.  
**Risk:** Low (CI-only).

### PR-B — Security hardening
**Branch:** `cursor/phase4-security-hardening-bde5`  
**Changes:**
- `convex/socialRateLimit.ts` — sliding-window limits for `createPost`, `addComment`, `toggleLike` (reuse `feedbackRateLimits`)
- Env kill-switch: `GIGA3_SOCIAL_WRITE_RATE_LIMIT` (`false` disables)
- Upload hardening: blocked dangerous extensions + security event on reject
- Client upload helper hardening (MIME/size already present — align messages)
- Unit tests under `tests/security/`

**Rollback:** Set `GIGA3_SOCIAL_WRITE_RATE_LIMIT=false` or revert Convex deploy.  
**Risk:** Medium-low; must not change mutation arg shapes.

### PR-C — Reliability + SW v170
**Branch:** `cursor/phase4-reliability-sw-v170-bde5`  
**Changes:**
- Bump `web/public/sw.js` → `giga3-shell-v170-production-readiness`
- Add `web/app/(app)/error.tsx` graceful fallback (chat/wallet/marketplace shell)
- Shared client `web/lib/network/safeAsync.ts` (timeout + retry wrapper for non-Convex fetch)
- Lightweight production readiness feature flags (`web/lib/productionFlags.ts`)
- Document offline recovery expectations (no behavior change to chat outbox)

**Rollback:** Revert SW name / error boundary files. Users keep data (auth/session untouched).  
**Risk:** Low.

### PR-D — Observability, admin ops, backup runbook
**Branch:** `cursor/phase4-ops-observability-bde5`  
**Changes:**
- Admin Security panel wired to `securityMonitoring` via admin session (new query wrapper)
- `docs/BACKUP_RECOVERY.md` — Convex export, env inventory, restore, rollback
- Client observability stub (`web/lib/observability/clientTelemetry.ts`) — flag-gated, default off
- Tests for rate-limit helpers + production flags

**Rollback:** Hide admin panel / disable telemetry flag.  
**Risk:** Low.

---

## Feature flags / env

| Name | Default | Purpose |
|------|---------|---------|
| `GIGA3_SOCIAL_WRITE_RATE_LIMIT` | on | Disable social write throttles |
| `NEXT_PUBLIC_GIGA3_CLIENT_TELEMETRY` | off | Optional client error breadcrumbs |
| Existing admin keys | — | Unchanged |

---

## Validation checklist (every PR)

- [ ] `npm test` (Vitest) passes
- [ ] `cd web && npm run lint` passes
- [ ] `cd web && npm run build` passes
- [ ] No auth/session contract changes
- [ ] API v1 paths unchanged
- [ ] No layout transforms that fight `chat-stable` / `gigasocial-stable`
- [ ] SW bump includes cache name only (no aggressive authenticated caching)

---

## Follow-ups (not blocking Phase 4 merge)

1. Optional feed/chat virtualization behind flag  
2. Origin checks on sensitive HTTP actions  
3. Gradual removal of `ignoreBuildErrors`  
4. External APM (Sentry) when DSN provisioned  
5. Server-side daily reward credit grants (product Phase 3)

---

## Success criteria

Giga3 is more secure (abuse throttles), more observable (admin security + runbooks), safer to deploy (Vitest CI), and offline/PWA updates cleanly to **v170** — while users see the same product surface.
