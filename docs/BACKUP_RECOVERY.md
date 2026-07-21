# Backup & Recovery — Giga3 AI

Operational guide for protecting user data without changing application architecture.

## What must be backed up

| Asset | System of record | Notes |
|-------|------------------|--------|
| App data (users, chat, social, wallet, marketplace) | **Convex** production `perfect-lark-521` | Primary DB |
| Optional chat/media history | **Supabase** (when `NEXT_PUBLIC_GIGA3_DATA_BACKEND=supabase`) | Secondary |
| Media blobs | Convex file storage / configured upload backends | Keep URLs valid after restore |
| Secrets & config | Convex env + GitHub Actions secrets | Never commit |
| Static PWA | `web/out` via Cloudflare Pages / host | Redeploy from git |

## Automated backups (Convex)

1. In [Convex Dashboard](https://dashboard.convex.dev) → deployment **perfect-lark-521** → **Settings → Backups**.
2. Enable **automatic backups** (daily recommended for production).
3. Confirm retention covers at least one full business week (prefer 14–30 days).
4. After any schema-affecting deploy, trigger a **manual snapshot** before and after.

> This Cloud Agent VM often cannot reach `*.convex.cloud`. Configure backups from a machine with Dashboard access or via Convex support/docs for your plan.

## Configuration backups

Export and store offline (password manager / encrypted vault):

```bash
# On a machine with Convex CLI auth — list keys (values stay in Dashboard)
npx convex env list

# Document required keys from AGENTS.md / DEPLOYMENT.md:
# SESSION_SIGNING_SECRET, PAYSTACK_SECRET_KEY, CONVEX_DEPLOY_KEY,
# FRONTEND_URL, QUALITY_DASHBOARD_ADMIN_KEY / admin session setup, AI provider keys
```

Also keep a dated copy of:

- GitHub repository secrets inventory (names only in git; values in vault)
- Cloudflare / hosting env vars for `NEXT_PUBLIC_CONVEX_URL`
- Paystack webhook URL: `https://perfect-lark-521.convex.site/paystack/webhook`

## Media backups

- Prefer provider-native durability (Convex storage replication).
- For critical creator assets, periodically export listing/file metadata via admin tools and verify URLs resolve.
- Do not delete storage objects until DB references are archived.

## Restore procedure (high level)

1. **Freeze writes** if possible (maintenance banner / feature flag) to avoid split-brain.
2. Restore the chosen Convex backup/snapshot into production (or a clone first).
3. Re-apply env vars from the vault if the deployment was recreated.
4. Redeploy Convex functions from the **same git SHA** that matches the restored schema.
5. Redeploy the static PWA (`web/out`) from that SHA.
6. Smoke-test: auth login, AI chat send, GigaSocial feed, marketplace browse, wallet balance, Paystack webhook health.
7. Clear stale PWA caches if users report chunk errors (service worker cache bump already handles most cases).

## Verification checklist

After every restore drill:

- [ ] `users:getUser` / session establish works
- [ ] Chat accept + reply path works
- [ ] Recent GigaSocial posts visible
- [ ] Wallet / credits balances match pre-restore sample
- [ ] Paystack `charge.success` webhook still verifies
- [ ] Admin dashboard loads with session token

Schedule a **restore drill** at least quarterly on a non-production clone when available.

## Rollback capability

| Change type | Rollback |
|-------------|----------|
| Frontend-only | Redeploy previous `web/out` artifact / git revert + Pages deploy |
| Convex functions | Redeploy previous git SHA with `npx convex deploy` or CI |
| Schema | Prefer additive migrations; restore snapshot only if data corruption |
| Feature flags | Flip remote config / kill-switches (e.g. social write rate limit) |

## Related

- `docs/DEPLOYMENT_SECURITY_REPORT.md` — auth & security ops
- `docs/PAYSTACK_PRODUCTION_CHECKLIST.md` — payment recovery
- Phase 4 PRs — security hardening, reliability SW v170, admin health panel
