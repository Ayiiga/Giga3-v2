# Giga3 AI — Smart Engagement System Phase 1 Audit

**Date:** 2026-10-16  
**Base:** `main` @ `a909fa3`  
**Scope:** Notifications, email, onboarding, ratings, lifecycle, push, admin, analytics  
**Constraints:** Reuse existing systems; keep GigaSocial DM flags off; Inbox ≠ Messages; no production campaign activation without approval.

---

## 1. Executive summary

Giga3 already has **substantial engagement infrastructure**. This is not a greenfield build. The correct approach is to **extend and unify** what exists (welcome email, digests, feature announcements, onboarding wizard, dual notification systems, web push, feedback, remote config, admin panels) rather than replace them.

Largest gaps versus the mission brief:

| Area | Status |
|------|--------|
| Welcome email (idempotent) | **Exists** (Resend + claim states) |
| Inactive digest + feature announcement email | **Exists** (cron + opt-out) |
| Chat onboarding wizard (role-based) | **Exists** (remote-config gated) |
| Smart welcome modal + interest checklist (product surface) | **Partial / missing** |
| Intelligent app-rating popup | **Missing** |
| Unified in-app notification preference matrix | **Partial** |
| Campaign admin (draft/test/kill switch UI) | **Missing** (crons are hard-coded) |
| Lifecycle state machine (new → dormant) | **Partial** (`lastActiveDateKey` only) |
| Non-user acquisition (newsletter double opt-in, safe invites) | **Partial** (beta waitlist + referral code fields) |
| Engagement popup priority coordinator | **Missing** |
| Outcome analytics for campaigns | **Partial** (Phase 5 product analytics; not campaign delivery funnel) |

---

## 2. Existing functionality (by audit question)

### 2.1 Notification systems (two parallel stacks)

**A. GigaSocial Inbox (activity)** — keep intact  
- Schema: `socialNotifications` (`convex/schema.ts`)  
- APIs: `gigaSocial.listNotifications`, `markNotificationsRead`, unread count  
- UI: `GigaSocialNotificationsPanel` + ContextNav **Inbox**  
- Types: likes, comments, follows, community activity (social-only)  
- **Must remain separate from Direct Messages** (DM UI remains flag-off)

**B. Platform notification center**  
- Schema: `platformNotifications` with categories:  
  `ai_task | marketplace | wallet | learning | creator | system | security | social | announcement`  
- APIs: `platformNotifications.listNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `createNotificationInternal`  
- UI: `NotificationCenter` / `NotificationBell` via `PlatformChromeHost`  
- Writers: media jobs, video, marketplace payments, chat reply worker, etc.

**Gaps:** no idempotency key / expiry / priority on `platformNotifications`; limited per-category user prefs; no welcome/onboarding/rating categories; risk of duplicating social events if both stacks fire for the same action.

### 2.2 Email provider and sending

**Provider:** [Resend](https://resend.com) via `convex/emailClient.ts`  
**Env:** `RESEND_API_KEY` (required for delivery), `AUTH_FROM_EMAIL`, `FRONTEND_URL`, `AUTH_EMAIL_FALLBACK_INBOX`  
**Deploy sync:** GitHub Actions → Convex on deploy (`DEPLOYMENT.md`, `convex-deploy.yml`)

**Already shipping:**

| Flow | Module | Notes |
|------|--------|-------|
| Password reset | `authPasswordActions` + `emailClient` | Transactional; not tied to marketing opt-out |
| Welcome email | `welcomeEmailDelivery` / `welcomeEmailClaim` / `engagementEmail` | Idempotent `sending\|sent\|uncertain\|failed` |
| Inactive digests | `engagementEmailActions.sendEngagementDigests` | Daily cron UTC 15:00; opt-in + cooldown |
| Feature announcements | `sendFeatureAnnouncementEmails` | Weekly Monday UTC 14:00; campaign keys + reconcile |
| Unsubscribe | `engagementEmailHttp.unsubscribeEngagementEmail` | Token + email; GET on Convex `.site` |

**Safety already present** (`engagementAnnouncementSafety.ts`): eligibility, sandbox sender preflight, redacted logs, claim/reconcile, 429 retries, bulk abort on domain issues.

**Gaps:** no admin preview/test UI; no campaign DRAFT/TEST lifecycle; digests use `users.take(500)` scan (scale risk); no separate getting-started / educational series tables; no complaint/bounce webhook handling documented in-app; transactional vs marketing distinction is soft (unsubscribe copy mentions it).

### 2.3 Registration and onboarding

- Auth: password + Google session minting (`authPasswordActions`, `authActions`); `ensureUserInternal`  
- Welcome email scheduled on successful sign-up path  
- **OnboardingWizard** (`web/components/onboarding/OnboardingWizard.tsx`): welcome → role → features → first steps  
- Persistence: `users.onboardingState` (JSON), `onboardingCompletedAt`, `userRole` via `platformProfile` / `usePlatformProfile`  
- Gate: `remoteConfig` key `onboarding.enabled` (default true in `convex/remoteConfig.ts`); chat shell only  
- Dismiss does not block the app  

**Gaps:** wizard is chat-centric, not a full-product welcome across GigaSocial/GigaLearn/Marketplace; no structured interest multi-select (relies on chat `interestProfile` + role); no first-session checklist with progress across surfaces; no engagement popup coordinator with Install/Push prompts.

### 2.4 Analytics and event tracking

- `userActivityDaily`, `platformStatsDaily`, `aiUsageEvents`, `phase5ProductAnalytics`  
- Admin: `AdminPhase5AnalyticsPanel` (7d counters)  
- Blog: `blogStats` view counts + star ratings  
- Client telemetry: `web/lib/observability/clientTelemetry.ts` (gated)

**Gaps:** no campaign funnel metrics (queued → accepted → delivered → clicked → returned → activated); rating-request analytics absent; open rates not tracked (by design — do not invent).

### 2.5 User account and preferences

On `users`: plan/credits, `interestProfile`, `userPreferences` JSON, `emailEngagementOptIn` (undefined = opted in), unsubscribe token, welcome/announcement fields, `lastActiveDateKey`, `referralCode` / `referredByUserId`, `accountStatus`.

Push category toggles live on `pushSubscriptions` (news/sports/social/…/muteAll).

**Gaps:** no dedicated `RatingRequestState`; no granular in-app notification category prefs for platform notifications; no quiet-hours field; marketing vs essential preference split is incomplete in UI.

### 2.6 Admin dashboard and permissions

- Route: `web/app/(marketing)/admin/` + panels (users, invites, Phase 4/5/6, feedback, analytics, security, social economy)  
- Auth: admin session / key gate patterns (`AdminKeyGate`, ops mutations as `internalMutation` where required)  
- Phase 5 controls via `remoteConfig` kill-switches  

**Gaps:** no campaign composer, segment picker, preview/send-test, pause/resume, delivery failure browser, or engagement threshold editor UI. Cron parameters are code constants.

### 2.7 Feature-flag systems (multiple)

1. **Convex `remoteConfig` / `remoteConfigEntries`** — `onboarding.enabled`, economy knobs, Phase 5/6  
2. **`web/lib/phase5Flags.ts`** — client mirror of `phase5.*`  
3. **GigaSocial `featureFlags.ts`** — includes `enableDirectMessages` (**default OFF** — do not enable here)  
4. **GigaEdit flags**, chat features via `getChatCredits`

**Recommendation:** add `engagement.*` remote-config keys (welcome modal, rating prompt, checklist, campaign kill switch) defaulting **OFF** until QA.

### 2.8 PWA and browser push

- Root SW: `web/public/sw.js` + `ServiceWorkerRegister`  
- App push: `pushSubscriptions`, queue, dedup, `pushNotificationDispatch`, crons for unread chat / social digest / media / repeat  
- UI: `PushPrompt` (delayed ~1.8s, mute/dismiss localStorage; suppressed on some paths)  
- Blog OneSignal: separate worker under `/push/onesignal/` (does not own root SW)  
- Feature gate: `pushAlerts` often false via credits features  

**Gaps:** prompt can still compete with onboarding/install; permission not always preceded by a strong value explainer; OneSignal ≠ app push — keep separate; no engagement-campaign push templates.

### 2.9 Cron / background jobs (`convex/crons.ts`)

Already scheduled: subscription renewal/expiry, media/chat recovery, live news, sports digest, push queue retry, **engagement digests**, **feature announcements**, unread chat push, social activity push, media completion push, repeat unseen push, GigaLearn morning reminder.

**Gaps:** no onboarding-reminder job; no rating eligibility job; no dormant-account review; no campaign runner with DRAFT/TEST.

### 2.10 Consent, unsubscribe, privacy

- Engagement opt-out: `emailEngagementOptIn` + one-click unsubscribe HTTP  
- Copy states password reset may still send  
- Soft default opt-in when field undefined (document clearly for compliance review)  
- Account suspension respected in engagement eligibility  

**Gaps:** no formal suppression-list table; no Resend webhook ingestion for bounces/complaints; newsletter double opt-in separate from accounts incomplete (beta waitlist exists); no quiet hours.

### 2.11 Mobile navigation and notification UI

- Global primary nav + GigaSocial ContextNav (Inbox vs Messages)  
- Platform bell / NotificationCenter  
- PWA install + push prompts  

**Constraint:** never merge Messages into Inbox; never enable DM as part of this work.

### 2.12 Tests and deployment

**Tests (representative):**  
`welcomeEmailIdempotency`, `welcomeEmailConvex`, `announcementEmailSafety`, `featureAnnouncementEmail`, `emailClient`, blog push SW tests, gigasocial DM tests (unrelated — leave alone).

**Deploy:** `convex-deploy.yml`, `pages.yml`, `ci-test.yml`, Resend domain workflow. Production Convex `perfect-lark-521`; Pages → Cloudflare.

**Rule:** campaigns must not auto-activate on deploy; keep new flags OFF.

---

## 3. Missing functionality (mission map)

| Mission item | Gap |
|--------------|-----|
| Smart welcome modal + Explore CTA | Not productized beyond chat OnboardingWizard |
| Interest multi-select for engagement | No dedicated interest picker; chat interestProfile only |
| First-session checklist (cross-product) | Missing |
| Smart app rating popup | Missing (blog stars ≠ app rating) |
| Rich notification engine (dedupe, expiry, prefs) | Extend `platformNotifications` |
| Getting-started / educational email series | Missing as first-class campaigns |
| Lifecycle states + cancel-on-return | Partial |
| Non-user channels (safe share, verified newsletter) | Partial |
| Campaign admin dashboard | Missing |
| Popup priority coordinator | Missing |
| Campaign outcome analytics | Missing |

---

## 4. Risks

1. **Dual notification stacks** — duplicating social events into platform notifications would confuse users.  
2. **Email scale** — `take(500)` candidate scan will not scale; needs indexed queries.  
3. **Soft marketing opt-in default** — legal/product review before expanding volume.  
4. **Popup pile-up** — Install + Push + Onboarding + Rating without a coordinator.  
5. **DM accidental enablement** — keep `NEXT_PUBLIC_GIGASOCIAL_DM` / `GIGASOCIAL_DM_ENABLED` off.  
6. **Cron side effects** — digests/announcements already live; do not raise volume without kill switch + approval.  
7. **Sandbox Resend** — `onboarding@resend.dev` only reaches owner inbox until domain verified.  
8. **Security** — admin campaign send must be server-authorized; no secrets in client; no auth tokens in email URLs.

---

## 5. Recommended implementation order

Ship behind **`engagement.*` remote-config flags (default OFF)** and DRAFT campaigns only.

1. **Foundation** — engagement remote-config keys, kill switch, popup priority coordinator, schema additions (rating state, optional campaign tables) additive only.  
2. **Welcome / onboarding upgrade** — cross-product welcome modal + interest checklist + dismiss persistence (reuse `onboardingState`).  
3. **App rating prompt** — eligibility engine + FeedbackModal / store URL config (no invented Play Store URL).  
4. **Platform notification extensions** — idempotency key, expiry, category prefs; wire welcome/onboarding events without duplicating GigaSocial Inbox.  
5. **Email campaign model** — DRAFT/TEST admin path wrapping existing Resend helpers; getting-started series; do not increase live cron volume yet.  
6. **Lifecycle state machine** — formalize states; cancel pending when user returns; indexed inactivity queries.  
7. **Push polish** — value-first opt-in; respect coordinator; never first-paint permission.  
8. **Non-user acquisition** — share/referral UX + verified newsletter (separate from accounts).  
9. **Admin campaign dashboard** — segments, preview, test send, pause, metrics, kill switch.  
10. **Analytics** — delivery vs outcome funnel; tests for all of the above.

---

## 6. Files likely to change (implementation phases)

**Reuse / extend**  
- `convex/emailClient.ts`, `engagementEmail*.ts`, `engagementAnnouncementSafety.ts`, `welcomeEmail*.ts`  
- `convex/platformNotifications.ts`, `convex/notifications.ts`, `convex/crons.ts`  
- `convex/platformProfile.ts`, `web/hooks/usePlatformProfile.ts`  
- `web/components/onboarding/OnboardingWizard.tsx`  
- `web/components/feedback/FeedbackModal.tsx`  
- `web/components/pwa/PushPrompt.tsx`, `InstallPrompt.tsx`  
- `web/components/notifications/NotificationCenter.tsx`  
- `web/components/admin/*`, `convex/remoteConfig.ts`, `convex/phase5Controls.ts`  
- `convex/schema.ts` (additive fields/tables only)

**Likely new**  
- `convex/engagementRating.ts` (or similar)  
- `convex/engagementCampaigns.ts` + schema tables  
- `web/components/engagement/WelcomeExperience.tsx`  
- `web/components/engagement/AppRatingPrompt.tsx`  
- `web/components/engagement/EngagementPromptCoordinator.tsx`  
- `web/components/admin/AdminEngagementCampaignsPanel.tsx`  
- Tests under `tests/convex/` and `tests/engagement/`

**Do not modify for this work**  
- GigaSocial DM enablement / flag defaults  
- Paystack fulfillment, auth session minting invariants  
- Replacing `socialNotifications` Inbox APIs

---

## 7. Environment variables / integrations

| Variable | Role | Notes |
|----------|------|-------|
| `RESEND_API_KEY` | Email send | Already required for reset + engagement |
| `AUTH_FROM_EMAIL` | From header | Prefer verified `giga3ai.com` |
| `FRONTEND_URL` | Links in email | Must be production origin |
| `AUTH_EMAIL_FALLBACK_INBOX` | Ops failure notices | Not for reset-link recipients |
| Convex site URL | Unsubscribe HTTP | Already used |
| VAPID / web-push secrets | App push | Existing push dispatch |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | Blog push only | Keep isolated |
| Optional store rating URL | Remote config | **Only if verified**; else feedback form |
| `NEXT_PUBLIC_GIGASOCIAL_DM` / `GIGASOCIAL_DM_ENABLED` | DM | **Leave off** |

---

## 8. Reusable components (prefer these)

1. Resend `sendEmail` + announcement safety preflight  
2. Welcome email claim/reconcile pattern for any new one-shot mail  
3. `emailEngagementOptIn` + unsubscribe HTTP  
4. `OnboardingWizard` + `platformProfile` persistence  
5. `FeedbackModal` / `userFeedbackSubmissions` for rating “Send Feedback”  
6. `platformNotifications` for in-app (non-social)  
7. `socialNotifications` for GigaSocial Inbox only  
8. `pushSubscriptions` + queue/dedup  
9. `remoteConfig` for kill switches and thresholds  
10. Admin panel patterns + Phase 5 analytics shell  
11. `referralCode` fields for transparent referral links  
12. Beta waitlist as a pattern for opt-in non-user email (harden before reuse)

---

## 9. Explicit non-goals for this program

- Enabling or marketing Direct Messages  
- Merging Inbox with Messages  
- Sending real bulk campaigns from this Cloud Agent without approval  
- Inventing store listings, testimonials, or user counts  
- Replacing Resend or Convex  
- Full-table redesign of GigaSocial

---

## 10. Phase 1 exit criteria

- [x] Repository inspected for notifications, email, onboarding, analytics, prefs, admin, flags, PWA push, crons, consent, nav, tests/deploy  
- [x] Existing vs missing mapped  
- [x] Risks and ordered plan documented  
- [x] Likely files and env vars listed  
- [ ] Owner review of soft opt-in default + Resend domain readiness before raising email volume  
- [ ] Implementation proceeds on `cursor/engagement-lifecycle-system-161d` behind default-off flags  

**Next:** Phase 2 — Smart Welcome Experience (extend onboarding; do not remove chat wizard).

---

## 11. Phase 2 progress (same branch)

Shipped behind **default-OFF** `engagement.*` remote-config keys:

- `convex/engagementControls.ts` + admin get/update in `remoteConfig.ts`
- `patchEngagementOnboarding` merge mutation (preserves chat onboarding JSON)
- `WelcomeExperience`, `FirstSessionChecklist`, `EngagementHost` (priority: kill → welcome → checklist)
- Mounted via `DeferredPwaChrome` (before install/push prompts)
- Client `useRemoteConfig` treats `engagement.*` as OFF until loaded

Still OFF in production until an admin enables flags. No live campaigns. DM flags untouched.
