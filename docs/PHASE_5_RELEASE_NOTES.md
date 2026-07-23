# Phase 5 — Release Notes

## Foundation (flags default OFF)

**What shipped**
- Remote + admin kill-switches for all Phase 5 modules (`phase5.*`)
- Client `usePhase5Flags()` / `mergeRemotePhase5Flags()` for gated UI
- Admin dashboard panel to enable/disable modules without redeploy
- Controlled rollout + rollback documentation

**What did NOT change**
- Auth, Chat, GigaSocial, Marketplace, Wallet, Studio, Camera, Search, Notifications
- No new surfaces visible to end users until an admin enables a flag

**Operator action**
- Review `/admin` → Phase 5 public beta controls
- Keep all flags disabled until module PRs land and Impl 10 checklist passes

## Impl 1 — Public beta expansion (`phase5.beta`)

**What shipped**
- Invite codes by cohort (students, teachers, creators, trusted testers, community leaders)
- Optional waitlist + admin waitlist workflow
- `/beta` waitlist / redeem UI (hidden until flag enabled)
- Admin invite management panel
- Activation stats (cohort members / onboarded %)

**Default:** OFF — enable `phase5.beta` only after seeding invite codes and passing Impl 10 checklist.

## Impl 2 — User feedback system (`phase5.feedback`)

**What shipped**
- Expanded categories: usability + content report (flag-gated)
- Auto priority ranking for admin queue
- Admin feedback resolution workflow (status + priority)
- Existing bug/feature/AI rating feedback unchanged when flag is off

**Default:** OFF for expanded types; core feedback modal remains available.

## Upcoming module releases

Release notes for Impl 3–9 will append below as each flagged PR merges.
