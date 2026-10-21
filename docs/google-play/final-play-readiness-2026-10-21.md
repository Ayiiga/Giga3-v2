# Giga3 AI — Final Google Play readiness (Phases 1–7)

**Date:** 2026-10-21 (UTC)  
**Branch:** `cursor/play-store-readiness-161d`  
**Architecture preserved:** Bubblewrap Trusted Web Activity wrapping `https://www.giga3ai.com/`  
**Package:** `com.giga3ai.app`  
**Submission status:** Ready for **owner Internal testing upload** after Console setup. **Not** production-submission complete. No AAB upload, Play publish, or production DAL deploy was performed.

---

## Exact release artifact

| Field | Value |
|-------|--------|
| AAB path | `/workspace/android/app/build/outputs/bundle/release/app-release.aab` |
| Artifact copy | `/opt/cursor/artifacts/app-release.aab` |
| Pre-rebuild backup | `/opt/cursor/artifacts/android-aab-backups/app-release-20261021-162222.aab` |
| Known-good backup | `/opt/cursor/artifacts/android-aab-backups/app-release-signed-known-good-20261021-162222.aab` |
| Rebuild backup | `/opt/cursor/artifacts/android-aab-backups/app-release-rebuilt-20261021-162342.aab` |
| File size | **1,120,063 bytes** (~1.07 MiB) |
| SHA-256 (file) | `d577f619806c1999d40549978659369904f1b068f09b9ba56cce27458a1d3a90` |
| Signing verification | `jarsigner -verify` → **`jar verified.`** |
| Package ID | `com.giga3ai.app` |
| versionCode | `1` |
| versionName | `1.0.0` |
| minSdk / targetSdk / compileSdk | `21` / **`36`** / **`36`** |
| Launch URL | `https://www.giga3ai.com/` |
| Digital Asset Links HTTP | **`404`** at `https://www.giga3ai.com/.well-known/assetlinks.json` |

---

## Phase 1 — Audit (facts)

| Item | Finding |
|------|---------|
| `android/` | Bubblewrap TWA project; Gradle 8.11.1; `com.android.application` |
| `twa-manifest.json` | Host `www.giga3ai.com`, package `com.giga3ai.app`, shortcuts Chat/Academy/Exam/Marketplace |
| Application ID | `com.giga3ai.app` (build.gradle + bundle manifest dump) |
| Target / compile SDK | **36** / **36** |
| Version | versionCode **1**, versionName **1.0.0** (suitable for first Play upload) |
| Keystore path | `android/upload-keystore.jks` (gitignored) |
| Alias | `android` |
| Signing config | `android/signing.properties` (gitignored) + `android/app/release-signing.gradle` |
| Signing backup | `android-signing-handoff/Giga3AI-Android-Backup.zip` (gitignored); keystore **byte-identical** to `upload-keystore.jks` |
| Replacement keys | **Not created** — existing keystore validated |

Upload certificate SHA-256 (from keystore + matches jarsigner cert):

`69:2B:C8:C3:2A:58:2E:7C:02:B6:7A:98:9E:D4:1B:88:37:2C:BD:0A:50:05:0B:F0:6A:08:6B:5F:CB:C4:6F:97`

---

## Phase 2 — Build validation

1. Confirmed `targetSdkVersion` / `compileSdkVersion` **36**.
2. Confirmed applicationId **`com.giga3ai.app`**.
3. Confirmed start URL **`https://www.giga3ai.com/`** (`launchUrl: '/'` + host).
4. Clean rebuild: `./gradlew :app:clean :app:bundleRelease` → **BUILD SUCCESSFUL** (signing configured; credentials not logged).
5. Existing AAB backed up **before** rebuild.
6. Bundle metadata via `bundletool dump manifest`: package, versionCode 1, versionName 1.0.0, targetSdk 36.
7. `jarsigner -verify` → **jar verified.**

---

## Phase 3 — Signing and security

| Check | Result |
|-------|--------|
| Keystore exists and opens with configured alias | Yes (`android`) |
| Certificate subject | CN=Giga3 AI, OU=Mobile, O=Intelligence Global Arena (GIGA), L=Accra, ST=Greater Accra, C=GH |
| Validity | 2026-10-20 → 2054-03-07 |
| Passwords / private keys in git | **No** (`.jks` + `signing.properties` gitignored; handoff dir gitignored) |
| Secrets printed in build logs | **No** (`Giga3 release signing: configured (keystore path resolved; credentials not logged).`) |
| Handoff backup keystore match | **Yes** |
| Play App Signing certificate | **Unknown** — not available until Console enrollment / first upload |

**Stop rule honored:** no replacement upload key was generated.

---

## Phase 4 — Digital Asset Links

| Check | Result |
|-------|--------|
| Production URL | `https://www.giga3ai.com/.well-known/assetlinks.json` |
| HTTP status | **404** (HTML SPA/404 body — not JSON) |
| Sibling `.well-known/security.txt` | **200** (path routing works for other well-known files) |
| Prepared JSON | `docs/google-play/assetlinks.prepared.json` |
| Upload fingerprint in prepared JSON | Present (real, from keystore) |
| Play App Signing fingerprint | **Missing** — slot `PASTE_PLAY_APP_SIGNING_CERT_SHA256_HERE` |
| Deployed to `web/public/.well-known/assetlinks.json` | **No** (would ship placeholder / incomplete Play cert) |
| Invented fingerprints | **None** |

**Dependency / next step:** After first AAB upload with Play App Signing enabled, copy **App signing key certificate** SHA-256 from Play Console → Setup → App signing into the prepared file, remove the `PASTE_*` token, copy to `web/public/.well-known/assetlinks.json`, then authorize a Cloudflare Pages deploy. Verify HTTP 200 + Google statements API.

---

## Phase 5 — Google Play assets audit

| Asset / item | Status |
|--------------|--------|
| 512×512 app icon | **Available** — `web/public/icons/icon-512.png` (512×512); also `android/store_icon.png` |
| 1024×500 feature graphic | **Prepared** — `docs/google-play/assets/feature-graphic-1024x500.png` (1024×500 RGB); owner should visually approve before upload |
| Genuine TWA screenshots | **Missing** — mobile website captures only at `/opt/cursor/artifacts/android-twa/store-screenshots/` (explicitly not installed-TWA screenshots) |
| Short description | Drafted in `store-listing-draft.md` |
| Full description | Drafted in `store-listing-draft.md` |
| Privacy policy URL | **Live** — `https://www.giga3ai.com/legal/privacy/` → 200 |
| Account deletion URL | **Live** — `https://www.giga3ai.com/legal/delete-account/` → 200 |
| Data Safety declaration | **Console only** — not done |
| Content rating (IARC) | **Console only** — not done |
| Ads declaration | **Console only** — not done |
| App access / reviewer login | **Owner must provide** test account |
| Developer account verification | **Owner only** |

No fabricated screenshots were uploaded or claimed as TWA device captures.

---

## Phase 6 — Testing

### Automated (this run)

| Test | Result |
|------|--------|
| `./gradlew :app:clean :app:bundleRelease` | BUILD SUCCESSFUL |
| `jarsigner -verify` on release AAB | jar verified |
| `bundletool dump manifest` | package / SDK / version OK |
| `./node_modules/.bin/vitest run tests/android/twaShortcuts.test.ts` | **5 passed** |
| Production homepage / manifest / SW / key routes | HTTP 200 |
| Production assetlinks.json | HTTP **404** |

### Emulator

| Test | Result |
|------|--------|
| `adb devices` | Empty — **no emulator/device attached** |
| TWA launch / DAL verification on Android | **Not run** |

### Physical device

| Test | Result |
|------|--------|
| Install / fullscreen TWA / login / navigation / offline | **Not run** — no physical device in this environment |

Do not treat website viewport screenshots as device verification.

---

## Phase 7 — Checklist A–E

### A. Complete and verified

- TWA project preserved; package `com.giga3ai.app`
- `targetSdkVersion` / `compileSdkVersion` **36**
- Start URL `https://www.giga3ai.com/`
- Existing upload keystore + alias `android` validated (fingerprints extracted; passwords not logged)
- Signing backup ZIP keystore matches working keystore
- Signed release AAB rebuilt after backup; `jarsigner` → jar verified
- versionCode `1` / versionName `1.0.0` for first upload
- Privacy + delete-account URLs HTTP 200
- Web manifest HTTP 200 (`name`, `start_url`, shortcuts present)
- 512×512 icon present
- Feature graphic file present at 1024×500
- Android shortcut regression tests (5) passed
- Secrets kept out of git

### B. Built but not yet independently verified

- Feature graphic visual quality / brand approval (file dimensions OK; creative review pending)
- Website mobile screenshots as interim listing art (not TWA-install captures)
- Billing policy posture vs Play (Paystack on web; Play Billing off) — see `billing-policy-review.md`
- Store listing copy (draft only)

### C. Requires action in Google Play Console

1. Create/register app with package **`com.giga3ai.app`**
2. Complete developer identity verification
3. Upload signed AAB to **Internal testing** (explicit approval required)
4. Enable **Play App Signing**; copy **App signing** SHA-256
5. Data Safety form
6. Content rating questionnaire
7. Ads declaration
8. Target audience / Families if applicable
9. App access instructions + reviewer test account
10. Upload store listing graphics + descriptions
11. Closed testing requirements if on a personal developer account (per Play policy docs)

### D. Requires physical-device testing

- Install release (or internal-track) build
- Confirm fullscreen TWA (no persistent Custom Tab URL bar) **after** DAL is live with the correct cert
- Login, navigation, external links, keyboard, offline/error, major GigaLearn flows
- Capture genuine phone screenshots from the installed app

### E. Blockers preventing submission

| Blocker | Severity | Notes |
|---------|----------|-------|
| Production Digital Asset Links **404** | **Hard for production TWA UX** | Fullscreen verification fails until real `assetlinks.json` is deployed with Play App Signing SHA-256 (upload SHA alone is insufficient for Play-installed builds) |
| Play App Signing certificate unknown | **Hard for correct DAL** | Cannot invent fingerprint; must come from Console after enrollment/upload |
| Store screenshots of installed TWA | **Hard for complete listing** | Website viewport PNGs are interim only |
| Console questionnaires (Data Safety, rating, ads, access) | **Hard for review** | Owner-only |
| Developer account verification | **Hard if incomplete** | Owner-only |
| Explicit approval to upload/publish | **Process** | Agent did not upload or publish |

**Not a binary blocker for Internal testing upload:** signed AAB with targetSdk 36 is ready for the owner to upload once Console app + verification exist. Production users will not get verified TWA until DAL is fixed.

---

## Owner-only next steps (ordered)

1. Confirm Play Console app ID `com.giga3ai.app` + finish verification.
2. Authorize **Internal testing** AAB upload of  
   `/workspace/android/app/build/outputs/bundle/release/app-release.aab`.
3. From **Setup → App signing**, copy App signing key SHA-256 into  
   `docs/google-play/assetlinks.prepared.json` (replace `PASTE_*`).
4. Authorize deploy of `web/public/.well-known/assetlinks.json` (HTTP 200 + valid JSON).
5. Physical-device smoke + real screenshots.
6. Complete Data Safety / rating / ads / app access.
7. Separate explicit approval required before production release.

---

## What was intentionally not done

- No Play Console upload or publish
- No production website/DAL deploy
- No new keystore / replacement signing credentials
- No second Android app or TWA architecture rewrite
- No invented Play App Signing fingerprints
- No claim of physical-device testing
