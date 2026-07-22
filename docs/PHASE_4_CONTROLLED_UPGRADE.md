# Phase 4 — Controlled Production Upgrade

**Context:** Phase 4 code is already on production (`main` @ `4bc3909`, SW **v170**).  
**This document:** Operate that upgrade safely for **existing users** — backups, release groups, flags, monitoring, rollback.  
**Non-goals:** No architecture rewrite, no auth change, no destructive migrations.

---

## Step 1 — Backup & safety (operators)

Before any further Convex/Pages deploy:

| Asset | Action | Owner |
|-------|--------|-------|
| Convex DB | Confirm **automatic backups** on `perfect-lark-521` + optional manual snapshot | Operator (Dashboard) |
| Config / env | Vault copy of Convex + GitHub secret **names**; never commit values | Operator |
| Media | Rely on Convex storage durability; do not purge objects | Operator |
| Git | Record previous SHA for rollback (`e0be4fb` pre–Phase 4 merge; current `4bc3909`) | Release eng |

Restore / DR: `docs/BACKUP_RECOVERY.md`.

---

## Step 2 — Environment audit (current production)

| Item | Status |
|------|--------|
| Schema-breaking migrations | None in Phase 4 |
| New npm dependencies | None |
| SW | `giga3-shell-v170-production-readiness` (live) |
| Social write rate limits | Live; env + remote kill-switches |
| Upload dangerous-extension block | Live (not flag-disableable) |
| Client telemetry | **Off** by default |
| Plugins / API v2 client | **Off** by default |
| Auth / session model | Unchanged |

Required env (unchanged): `SESSION_SIGNING_SECRET`, `PAYSTACK_SECRET_KEY`, `CONVEX_DEPLOY_KEY`, `FRONTEND_URL`, `NEXT_PUBLIC_CONVEX_URL`.

---

## Step 3 — Release groups (already shipped; now controllable)

| Group | Contents | Remote flag | Default |
|-------|----------|-------------|---------|
| **1 Security & monitoring** | Rate limits, upload hardening, security events, health panel | `phase4.security`, `phase4.monitoring` | enabled |
| **2 Performance & reliability** | SW v170, app error boundary, safeAsync, offline hints | `phase4.offline`, `phase4.reliability` | enabled |
| **3 Admin & business infra** | Admin Phase 4 controls + security health UI | `phase4.admin_tools` | enabled (auth-restricted) |

Admin UI: `/admin` → **Phase 4 controlled upgrade** panel (requires admin session).

### Emergency disable (no redeploy)

1. Admin toggle: disable `phase4.security` → social write rate limits pause  
2. Or Convex env: `GIGA3_SOCIAL_WRITE_RATE_LIMIT=false` (force-off)  
3. Disable `phase4.monitoring` / `phase4.admin_tools` to hide new admin surfaces  
4. Full code rollback: redeploy previous git SHA (Pages + Convex)

**Never flag-off:** upload extension blocking, CSP/HSTS headers, session auth.

---

## Step 4 — Feature flag control matrix

| Flag | Enable | Disable effect |
|------|--------|----------------|
| `phase4.security` | Rate limits on | Rate limits off (writes still validated) |
| `phase4.monitoring` | Health/security visibility | Panel/data emphasis reduced |
| `phase4.offline` | Offline recovery hints | Hints off; SW cache remains |
| `phase4.reliability` | safeAsync preference | Prefer legacy call paths for new helpers |
| `phase4.admin_tools` | Phase 4 admin controls visible | Controls can be turned off via prior enable then disable |

Client local overrides: `localStorage.giga3_production_flags_v1` (dev/staging only recommended).

---

## Step 5 — Real user validation checklist

Signed-in Stage 2 (required before calling upgrade “complete”):

- [ ] Existing user login / session restore  
- [ ] AI Chat send + reply  
- [ ] GigaSocial feed, like, comment, create  
- [ ] Upload image (and reject `.exe` / double extension)  
- [ ] Communities / notifications / search  
- [ ] Marketplace browse + wallet view  
- [ ] Media / AI Studio open  
- [ ] Camera + teleprompter open (no crash)  
- [ ] Installed PWA still launches  

Stage 1 smoke (already done 2026-07-21): home, chat shell, feed, marketplace, media, wallet, offline, pricing — PASS.

---

## Step 6 — Low network / device

- [ ] Airplane mode → offline page / cached marketing shell  
- [ ] Reconnect → chat/social outbox flush (no duplicate posts)  
- [ ] Slow 3G: feed scroll stable, no shake  
- [ ] Budget Android: navigate chat ↔ feed ↔ media ×10  

---

## Step 7 — Monitoring (72h+)

Watch admin **Security & system health** + Convex logs + Paystack:

- Login / auth_failure spikes  
- Rate_limit floods  
- Chat / upload / payment errors  
- API latency  

Alert thresholds (suggested): auth failures >2× baseline; payment webhook failures any sustained; Convex error rate jump.

---

## Step 8 — Rollback

| Severity | Action |
|----------|--------|
| Rate-limit friction | Disable `phase4.security` or set env kill-switch |
| Admin UI issue | Disable `phase4.admin_tools` |
| Broad regression | Redeploy git SHA `e0be4fb` (pre-integration) or last known good |
| Data corruption (unlikely; no schema change) | Convex backup restore per `BACKUP_RECOVERY.md` |

---

## Final validation

Upgrade is **operationally controlled** when:

- Backups confirmed in Dashboard  
- Phase 4 flags visible in `/admin`  
- Stage 2 signed-in checks green  
- 72h monitoring owned  
- Kill-switches tested once in staging or carefully in prod  

Production code for Phase 4 is live; **controlled upgrade** means flags + monitoring + human Stage 2 — not a second full redeploy of unrelated features.
