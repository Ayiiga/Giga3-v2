# Phase 6 — Controlled Rollout & Rollback

## Release groups

| Group | Flags | Audience | Prerequisite |
|-------|-------|----------|--------------|
| A — Ops | `phase6.admin_tools`, `phase6.operations` | Admins | Phase 4/5 monitoring healthy |
| B — Compliance | `phase6.compliance` | All users (opt-in UI) | Legal copy reviewed |
| C — Multi-region | `phase6.multi_region` | Cohort % | Locale/TZ defaults validated |
| D — Creators | `phase6.creator_ecosystem` | Verified creators | Phase 5 creator success understood |
| E — Education | `phase6.education` | Schools | GigaLearn + org classrooms intact |
| F — Orgs | `phase6.org_accounts` | Schools/businesses | Existing enterprise APIs green |
| G — AI | `phase6.ai_platform` | Trusted cohorts | Cost monitoring on |
| H — Commerce | `phase6.commerce` | Creators + billing | Paystack live healthy |
| I — Partnerships | `phase6.partnerships` | Ambassadors | Referral abuse controls on |

Use `rolloutPercent` for % cohorts when enabling.

---

## Pre-enable validation (Impl 10)

- [ ] Authentication / session restore
- [ ] AI Chat send + reply
- [ ] GigaSocial feed + post
- [ ] Communities
- [ ] Marketplace / Wallet
- [ ] AI Studio / uploads
- [ ] Notifications / Search / Camera / Teleprompter
- [ ] Vitest green
- [ ] Mobile + low-network smoke
- [ ] Accessibility spot-check

---

## Kill-switch

1. `/admin` → **Phase 6 Africa launch controls**
2. Disable affected flag
3. Confirm surface hides after remoteConfig refresh
4. Server handlers already check `isPhase6FlagEnabled`

| Layer | Action |
|-------|--------|
| Feature surface | Disable `phase6.*` |
| Bad Convex deploy | Redeploy prior successful Convex run |
| Bad Pages deploy | Redeploy prior `main` Pages run |
| Data | Additive only — do not drop tables |

---

## Env notes

- No new required env vars for foundation
- Paystack / VAPID / Phase 4–5 kill-switches unchanged
