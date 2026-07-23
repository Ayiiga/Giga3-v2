# Phase 5 — Controlled Rollout & Rollback

## Release groups

| Group | Flags | Audience | Prerequisite |
|-------|-------|----------|--------------|
| A — Ops | `phase5.admin_tools`, `phase5.product_analytics` | Admins only | Phase 4 monitoring healthy |
| B — Feedback | `phase5.feedback` | Existing users (opt-in UI) | Admin workflow verified |
| C — Beta | `phase5.beta` | Trusted testers / students / creators | Invite codes seeded |
| D — Growth | `phase5.community_growth`, `phase5.personalization` | Cohort % rollout | Consent copy reviewed |
| E — Creator | `phase5.creator_success`, `phase5.monetization_beta` | Verified creators | Economy flags already understood |
| F — Education | `phase5.education` | Schools / teachers | Org tables intact |
| G — Marketing | `phase5.marketing` | Public marketing pages | No chat/shell impact |

Use `rolloutPercent` on remoteConfig for % cohorts when enabling.

---

## Pre-enable validation (Impl 10)

Before enabling any product flag in production:

- [ ] Authentication sign-in / session restore
- [ ] AI Chat send + reply
- [ ] GigaSocial feed scroll + post
- [ ] Communities join/leave
- [ ] Search
- [ ] Uploads (image/video)
- [ ] Notifications / push (if subscribed)
- [ ] Marketplace browse
- [ ] Wallet / credits balance
- [ ] AI Studio / media generate
- [ ] Regression Vitest green
- [ ] Mobile + low-network smoke (3G/H+)
- [ ] Accessibility spot-check (focus, labels)

---

## Kill-switch procedure

1. Open `/admin` → **Phase 5 public beta controls**
2. **Disable** the affected flag
3. Confirm client hides the surface within one remoteConfig refresh
4. If server mutations must stop: keep flag check in Convex handlers via `isPhase5FlagEnabled`
5. Only redeploy if a code defect remains with flags off

---

## Rollback documentation

| Layer | Action |
|-------|--------|
| Feature surface | Disable `phase5.*` in admin |
| Bad Convex deploy | Re-run previous successful Convex deploy workflow / redeploy prior commit |
| Bad Pages deploy | Redeploy prior `main` commit via Cloudflare Pages workflow |
| Data | Additive tables only — do not drop; orphaned rows are inert when flags are off |

---

## Env notes

- No new required env vars for foundation
- Existing: `GIGA3_REFERRALS_ENABLED`, `GIGA3_ONBOARDING_ENABLED`, Paystack, VAPID remain unchanged
- Phase 4 kill-switch `GIGA3_SOCIAL_WRITE_RATE_LIMIT=false` still applies
