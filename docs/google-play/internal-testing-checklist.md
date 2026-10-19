# Giga3 Android — internal testing checklist

Use this matrix when testing the **Internal testing** track build on physical devices. The TWA loads **https://www.giga3ai.com/** — behavior should match the production PWA unless noted.

**Important:** Mark each item only after you have **actually executed** the test on a device. This document is a template; unchecked items are expected until the owner completes testing.

**Test build:** Play Internal testing install **or** sideload `app-debug.apk` / signed release for local QA.

**Paystack:** Use **test/sandbox mode** unless explicitly approved for live charges.

---

## Pre-flight

- [ ] App installs from Play internal link or sideload succeeds
- [ ] App icon shows as **Giga3** on launcher
- [ ] Splash screen appears (dark background `#0A0A0F`, Giga3 branding)
- [ ] After splash, site loads (full-screen TWA **after** Digital Asset Links deployed; browser chrome may appear until then)
- [ ] `assetlinks.json` deployed with real SHA-256 (required for verified TWA)

---

## Authentication

| Test | Pass | Notes |
|------|------|-------|
| Sign up (new account) | ☐ | Email/password flow |
| Login (existing account) | ☐ | |
| Logout | ☐ | Session cleared |
| Session persistence | ☐ | Kill app, reopen — still logged in |
| Password reset email | ☐ | Link opens in browser or in-app tab |
| Google Sign-In | ☐ | Requires Android OAuth client — see `google-sign-in-android.md` |

---

## Giga3 AI

| Test | Pass | Notes |
|------|------|-------|
| AI chat — send message | ☐ | |
| AI chat — receive reply | ☐ | |
| Model tier selection (Fast/Smart/Vision/Creator) | ☐ | |
| AI tools / modes | ☐ | As exposed in web UI |
| GigaLearn — browse courses | ☐ | `/gigalearn/` |
| GigaLearn — lesson progress | ☐ | |
| Credits display / wallet | ☐ | |

---

## Marketplace

| Test | Pass | Notes |
|------|------|-------|
| Browse marketplace | ☐ | `/marketplace/` |
| Product detail page | ☐ | |
| Add to cart / checkout initiation | ☐ | Uses website flow |
| Return navigation after browsing | ☐ | |

---

## Payments (Paystack — website flow)

| Test | Pass | Notes |
|------|------|-------|
| Open subscribe / credits / wallet | ☐ | |
| Paystack checkout opens | ☐ | Inline or redirect |
| Paystack **test mode** transaction | ☐ | No live charges without approval |
| Successful payment → return to Giga3 | ☐ | `/payment/success/` |
| Cancelled payment | ☐ | User can dismiss / back out |
| Failed payment handling | ☐ | `/payment/failed/` or error UI |
| Credits/subscription reflected after success | ☐ | Refresh wallet |

**Policy note:** Paystack-only digital goods may require legal review before production Play release — see `billing-policy-review.md`.

---

## Media

| Test | Pass | Notes |
|------|------|-------|
| Camera capture (chat / media studio) | ☐ | Runtime permission prompt |
| Microphone / voice dictation | ☐ | Where supported in web UI |
| File upload (documents) | ☐ | |
| Image upload | ☐ | |
| Video upload | ☐ | If applicable to feature tested |
| Image Studio / media generation | ☐ | `/media/` |

---

## Navigation

| Test | Pass | Notes |
|------|------|-------|
| Android back button | ☐ | In-app history vs exit |
| External links (e.g. legal, social) | ☐ | May open Custom Tab |
| Deep link to `https://www.giga3ai.com/chat/` | ☐ | Intent filter |
| Launcher shortcuts — Chat | ☐ | |
| Launcher shortcuts — Video AI | ☐ | |
| Launcher shortcuts — Marketplace | ☐ | |
| Launcher shortcuts — GigaLearn | ☐ | |
| In-app navigation (header/footer links) | ☐ | |

---

## Android shell

| Test | Pass | Notes |
|------|------|-------|
| Portrait orientation (configured default) | ☐ | |
| Screen rotation behavior | ☐ | |
| App restart (recents / cold start) | ☐ | |
| Network loss → offline / error UI | ☐ | |
| Network reconnection | ☐ | |
| Notifications (if enabled) | ☐ | `POST_NOTIFICATIONS` on Android 13+ |
| Location (if used by web feature) | ☐ | Delegation library |
| Site settings shortcut | ☐ | Long-press app icon |
| Clear site data / manage space | ☐ | |

---

## Regression vs PWA

| Test | Pass | Notes |
|------|------|-------|
| Same login works on desktop PWA | ☐ | |
| Paystack flow identical to mobile browser | ☐ | |
| No unexpected Play Billing prompts | ☐ | Billing disabled in TWA manifest |

---

## Sign-off

| Role | Name | Date | Build (versionCode) |
|------|------|------|---------------------|
| Engineering | | | |
| Product | | | |
| Owner | | | |

---

## Known limitations (not device-tested in repo CI)

- Emulator/device tests are **not** run automatically in this repository.
- Digital Asset Links must be deployed before expecting verified full-screen TWA.
- Google Sign-In on Android requires Play Console / Google Cloud OAuth configuration.
