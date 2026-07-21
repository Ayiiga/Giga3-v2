# Phase 1–4 Staging Release — Merge, Deploy & Rollback

**Branch:** `cursor/phase1-4-staging-release-bde5`  
**Base:** `main`  
**Date:** 2026-07-21  
**Status:** Staging integration ready for human approval — **do not treat as production-complete until post-deploy monitoring passes**

---

## Scope included

| Phase | Source | Contents |
|-------|--------|----------|
| **1 (foundation)** | Already on `main` | Auth, AI Chat, GigaSocial base, Marketplace, Wallet, Media/Studio, Camera, Teleprompter, Notifications, Search |
| **2** | PR [#211](https://github.com/Ayiiga/Giga3-v2/pull/211) | AI creator platform: post AI actions, data saver, social outbox, creator levels, AI Studio hub, feed ranking, tips/wallet UI |
| **3** | PR [#212](https://github.com/Ayiiga/Giga3-v2/pull/212) | Communities catalog, discovery, UX skeletons/empty states, plugins/AI router helpers, growth hub, smart notifications |
| **4A** | PR [#213](https://github.com/Ayiiga/Giga3-v2/pull/213) | Production readiness plan + CI Vitest gate |
| **4B** | PR [#214](https://github.com/Ayiiga/Giga3-v2/pull/214) | Social write rate limits, upload filename hardening, sensitive cache headers |
| **4C** | PR [#215](https://github.com/Ayiiga/Giga3-v2/pull/215) | App error boundary, `safeAsync`, production flags, **SW v170** |
| **4D** | PR [#216](https://github.com/Ayiiga/Giga3-v2/pull/216) | Admin security/health panel, telemetry stub (off), backup runbook |

### Conflict resolutions applied on staging

1. **`featureFlags.ts`** — union of Phase 2 + Phase 3 flags (both sets kept).
2. **`GigaSocialPostCard`** — Phase 2 double-tap like + Phase 3 haptics.
3. **`GigaSocialFeedPanel`** — both `useConnectionQuality` and `SocialEmptyState`.
4. **`sw.js`** — final cache name **`giga3-shell-v170-production-readiness`**; `/wallet/` and `/admin/` excluded from offline document cache.

### Explicitly not changed

- No `convex/schema.ts` migrations (additive community slugs only in code).
- No new npm dependencies.
- No auth/session rewrite.
- No API v1 breaking changes.
- Client telemetry **default OFF**.

---

## Audit results

| Check | Result |
|-------|--------|
| Merge conflicts vs `main` (individual PRs) | Clean before integration |
| Phase 2↔3 conflicts | Resolved on staging (see above) |
| Secrets / test keys in diff | None found |
| Schema-breaking migrations | None |
| Package lock / dependency changes | None |
| Debug `debugger` / new noisy `console.log` | None notable |
| Production build | ✅ Pass (`web` static export) |
| Lint | ✅ Pass (pre-existing hook warnings only) |
| Automated tests | ✅ 122 tests in phase-related suites; full `npm test` run on staging |

### New / notable env flags (all optional)

| Variable | Default | Purpose | Kill-switch |
|----------|---------|---------|-------------|
| `GIGA3_SOCIAL_WRITE_RATE_LIMIT` | on (unset) | Social write rate limits | set `false` |
| `NEXT_PUBLIC_GIGA3_CLIENT_TELEMETRY` | off | Client telemetry stub | leave unset / `0` |
| `NEXT_PUBLIC_GIGASOCIAL_*` | mostly on | Feature flags for Phase 2/3 surfaces | set `false` / `0` |
| Plugins / API v2 client | **off** by default | Safer staged enable | leave off for launch |

---

## Merge checklist (staging → `main`)

- [x] All Phase 2–4 commits present on staging branch
- [x] Conflicts resolved and documented
- [x] No secrets in tree
- [x] No schema-breaking migrations
- [x] `npm test` / scoped Vitest green
- [x] `cd web && npm run lint` green
- [x] `cd web && npm run build` green
- [ ] Human code review of staging PR
- [ ] Mark draft PRs #211–#216 superseded / close after merge
- [ ] Confirm GitHub Actions **Deploy Convex backend** will run on merge
- [ ] Confirm Cloudflare/Pages (or host) will publish `web/out`
- [ ] Convex Dashboard backup enabled before merge (see `docs/BACKUP_RECOVERY.md`)

**Merge order if landing individually instead of this staging PR:**  
4A → 4B → 2 → 3 → 4C → 4D (SW ends at v170).  
**Preferred:** merge this staging integration PR once.

---

## Deployment checklist

### Pre-deploy

1. Snapshot / confirm Convex automatic backups for `perfect-lark-521`.
2. Note current production git SHA for rollback.
3. Verify secrets already set (do **not** rotate mid-release unless required):
   - `SESSION_SIGNING_SECRET`, `PAYSTACK_SECRET_KEY`, `CONVEX_DEPLOY_KEY`
   - `FRONTEND_URL=https://www.giga3ai.com`
4. Optional kill-switches ready: `GIGA3_SOCIAL_WRITE_RATE_LIMIT=false`, feature env flags.

### Deploy sequence (gradual)

| Stage | Who | Actions |
|-------|-----|---------|
| **1 — Internal** | Devs / admins | Merge to `main` → wait for Convex CI + static deploy → hard-refresh PWA (SW v170) |
| **2 — Limited** | Small internal cohort | Exercise auth, chat, feed, create/like/comment, upload, wallet view, marketplace browse, admin health |
| **3 — Creators** | Selected creators | AI Studio, teleprompter, communities, tips/wallet UI, growth hub |
| **4 — Full** | All users | Keep flags as-is; only enable plugins/API v2 later |

### Post-deploy smoke (Stage 1 gate)

- [ ] Login / logout / session restore
- [ ] AI Chat send + reply
- [ ] GigaSocial feed load, like, comment, create post
- [ ] Image/video upload reject dangerous extension (negative test)
- [ ] Marketplace list + wallet page load
- [ ] Media / AI Studio open
- [ ] Camera / teleprompter open (no crash)
- [ ] Search + notifications panels
- [ ] `/offline/` available when network disabled
- [ ] Admin → Security & system health panel (authorized only)
- [ ] No UI shake / layout thrash on chat or feed (mobile)

### Convex note

This Cloud Agent VM often **cannot** reach `*.convex.cloud`. Production Convex deploy must go through **GitHub Actions** or a machine with deploy key access.

---

## Rollback plan

| Layer | Action | Data impact |
|-------|--------|-------------|
| **Frontend** | Redeploy previous `main` SHA / Pages artifact | None (sessions local; SW cache name changes again on next bump) |
| **Convex functions** | Redeploy previous git SHA via CI | None if no schema change (this release has none) |
| **Social rate limits** | `npx convex env set GIGA3_SOCIAL_WRITE_RATE_LIMIT false` | Immediate relief; no data loss |
| **Feature surfaces** | Set relevant `NEXT_PUBLIC_GIGASOCIAL_*=false` and rebuild, or localStorage overrides for testers | UI only |
| **Telemetry** | Keep off (default) | N/A |
| **DB** | Restore Convex backup only if corruption (not expected) | Follow `docs/BACKUP_RECOVERY.md` |

**Do not** roll back DB for a frontend-only issue.

---

## Security validation (Phase 4)

- [x] Social writes rate-limited (`createPost` / `addComment` / `toggleLike`)
- [x] Upload dangerous extensions blocked (`uploadSecurity`)
- [x] Wallet/credits/admin `Cache-Control: no-store` in `_headers`
- [x] SW does not cache wallet/admin documents
- [x] Admin security dashboard requires `ensureAdminAccess` (**awaited**)
- [x] Client telemetry off; sanitizes sensitive keys if enabled
- [ ] Manual: confirm production responses include security headers after Pages deploy

---

## Performance / network validation

Automated in CI/unit:

- Safe async retry/dedupe helpers
- SW v170 cache identity test
- Existing connection-quality / offline snapshot tests

Manual (Stage 2 — required before full release):

- [ ] Low-end Android: feed scroll ~60fps, no shake
- [ ] Slow / offline: chat outbox + social outbox recovery
- [ ] After airplane mode toggle: feed/chat recover without duplicate posts
- [ ] Memory: navigate chat ↔ feed ↔ media 10× without tab crash

---

## 72-hour post-deploy monitoring

Watch (admin panel + Convex logs + Paystack dashboard):

1. Login / auth failure spikes (`securityEvents`)
2. Rate-limit events (expected mild; investigate floods)
3. AI chat accept/reply errors
4. Upload failures / attachment rejects
5. Payment `charge.success` webhook health
6. API latency / Convex error rate
7. Crash / chunk-load recovery reports from users

**Escalate immediately** if login failures, payment failures, or chat error rate jump vs baseline.

---

## Final release approval

Deployment to production is approved only when:

- Staging PR merged after review  
- Convex + static deploys succeeded  
- Stage 1 smoke checklist green  
- Backups verified  
- Rollback path confirmed  
- 72h monitoring owned by an on-call person  

Until then, treat this branch as **staging validation only**.
