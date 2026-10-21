# Giga3 AI — Google Play readiness report (2026-10-21)

**Final status: READY FOR INTERNAL TESTING**  
(Technical binary + policy URLs ready for owner Console upload. **Not** ready for production submission. Google approval is not guaranteed.)

---

## 1. Documentation download report

| File | Source | Format | Readable |
|------|--------|--------|----------|
| `01_Play_Console_Requirements.pdf` | https://support.google.com/googleplay/android-developer/answer/10788890 | PDF | Yes |
| `02_Target_API_Requirements.pdf` | https://support.google.com/googleplay/android-developer/answer/11926878 | PDF | Yes (API 36 / Android 16 from 2026-08-31) |
| `03_App_Review_Requirements.pdf` | https://support.google.com/googleplay/android-developer/answer/9859455 | PDF | Yes |
| `04_App_Setup_and_Release.pdf` | https://support.google.com/googleplay/android-developer/answer/9859152 | PDF | Yes |
| `05_Personal_Account_Testing.pdf` | https://support.google.com/googleplay/android-developer/answer/14151465 | PDF | Yes |
| `06_Testing_Tracks.pdf` | https://support.google.com/googleplay/android-developer/answer/9845334 | PDF | Yes |
| `07_Technical_Quality_Requirements.pdf` | https://support.google.com/googleplay/android-developer/answer/17492799 | PDF | Yes |

**Failed downloads:** none  

**Method limitation:** Interactive Chrome “Print → Save as PDF” via computer-use agent was unavailable (model usage). Official Google Chrome headless `--print-to-pdf` wrote into the Chrome Downloads tree instead.

## 2. Exact file paths of saved documents

Primary (Chrome Downloads):

`/home/ubuntu/Downloads/GooglePlay_Giga3AI_Readiness/`

- `README.txt`
- `01_Play_Console_Requirements.pdf` … `07_Technical_Quality_Requirements.pdf`

Artifact mirror (agent VM):

`/opt/cursor/artifacts/GooglePlay_Giga3AI_Readiness/`

## 3. PDF readability

Each PDF was opened with `pdftotext`; first-page text matches the official article titles listed above.

## 4. Actual Android architecture discovered

| Item | Evidence |
|------|----------|
| Architecture | **Trusted Web Activity (TWA)** via Bubblewrap — thin Android shell; production PWA at `https://www.giga3ai.com/` |
| Not Capacitor / Cordova | Confirmed (`androidbrowserhelper`, `twa-manifest.json`) |
| Package / applicationId | `com.giga3ai.app` |
| versionCode / versionName | `1` / `1.0.0` |
| minSdk / targetSdk / compileSdk | `21` / **36** / **36** |
| Permissions in APK | `POST_NOTIFICATIONS` only (location delegation off; camera/mic via web runtime) |
| Signing | Local upload keystore supported via `android/app/release-signing.gradle` (gitignored credentials) |
| AAB workflow | `cd android && ./gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab` |
| Play Billing in TWA | **Disabled** (`playBilling.enabled: false`) — web Paystack remains |

## 5. Compliance checklist (A–T)

| ID | Requirement | Status | Evidence / notes |
|----|-------------|--------|------------------|
| A | Developer account verification | **NEEDS REVIEW** | Owner must complete Play Console identity verification |
| B | App identity / package registration | **NEEDS REVIEW** | Package `com.giga3ai.app` configured in repo; Console reservation not verified here |
| C | Target API level | **PASS** | `targetSdkVersion 36` / `compileSdkVersion 36` meets Aug 31, 2026 API 36 rule |
| D | Android App Bundle | **PASS** | Signed `bundleRelease` AAB built 2026-10-21 (`jarsigner`: jar verified) |
| E | Versioning | **PASS** | versionCode 1 / versionName 1.0.0 consistent for first upload |
| F | App signing | **PASS** (upload key local) / **NEEDS REVIEW** (Play App Signing) | Upload-signed AAB works after path fix; Play App Signing cert SHA still Console-only |
| G | Privacy policy | **PASS** | `https://www.giga3ai.com/legal/privacy/` → HTTP 200 |
| H | Data Safety declarations | **NEEDS REVIEW** | Must be filled in Play Console to match live data practices |
| I | Ads declarations | **NEEDS REVIEW** | Owner declares whether ads are shown |
| J | Target audience / content rating | **NEEDS REVIEW** | IARC questionnaire in Console |
| K | App access / reviewer instructions | **NEEDS REVIEW** | Provide test account if gated features require sign-in |
| L | Permissions / sensitive data | **PASS** (manifest) | Only `POST_NOTIFICATIONS`; no location permission in APK |
| M | Billing / payments policy | **NEEDS REVIEW** | See `billing-policy-review.md` — Paystack on web; Play Billing off in TWA |
| N | Store listing assets | **PARTIAL** | Icon 512×512 + feature graphic 1024×500 files ready; **installed-TWA screenshots** still outstanding |
| O | App functionality / stability | **NEEDS REVIEW** | Debug + release builds succeed; no physical Android device test in this run |
| P | Testing-track requirements | **NEEDS REVIEW** | Personal accounts may require closed testing before production (doc 05) |
| Q | Account deletion | **PASS** (URL) | `https://www.giga3ai.com/legal/delete-account/` → HTTP 200 |
| R | Child safety / Families | **NEEDS REVIEW** | Declare if targeting children; default education audience needs owner confirmation |
| S | Technical quality | **NEEDS REVIEW** | Meet Play quality pillars after device testing |
| T | Policy deadlines | **PASS** (API) | Target API 36 already set for 2026-08-31 deadline |

**Digital Asset Links (TWA fullscreen):** **FAIL** — production `/.well-known/assetlinks.json` still **404**. Do not deploy placeholders. Prepared file has upload fingerprint; Play App Signing fingerprint still required.

## 6. Technical problems fixed (this pass)

1. **Release signing path** — `release-signing.gradle` resolves `storeFile` from `android/` (`rootProject`) and trims whitespace (fixes unsigned AAB when keystore lived next to `signing.properties`).
2. **Retired Video AI launcher shortcut** — regenerated TWA from current `web/public/manifest.json`; shortcuts are Chat / Academy / Exam Practice / Marketplace.
3. **Bubblewrap `androix.browser` typo** — corrected in `AndroidManifest.xml`; generate script now auto-fixes if it reappears.
4. **Prepared DAL** — upload-key SHA-256 filled in `docs/google-play/assetlinks.prepared.json`; Play App Signing slot remains `PASTE_*`.
5. **Regression tests** — `tests/android/twaShortcuts.test.ts`.

**Not done (requires owner):** deploy `assetlinks.json`, upload AAB, store listing assets, Console questionnaires, publish.

## 7. Tests performed

| Check | Result |
|-------|--------|
| Chrome PDF pack (7 docs + README) | Saved + readable |
| `./gradlew bundleRelease` | BUILD SUCCESSFUL; AAB ~1.1 MB; `jarsigner` → jar verified |
| `./gradlew assembleDebug` | BUILD SUCCESSFUL |
| `vitest tests/android/twaShortcuts.test.ts` | 4 passed |
| Live privacy / delete-account URLs | 200 |
| Live assetlinks.json | **404** |
| Physical device / emulator install | **Not completed** (emulator historically offline in this environment) |

Credentials / keystore passwords were **not** printed or committed.

## 8. Outstanding account-owner actions

1. Confirm/create Play Console app with package `com.giga3ai.app`.
2. Complete developer verification (personal/org as applicable).
3. Upload signed AAB to **Internal testing** (do not publish production without approval).
4. Enable Play App Signing; copy **App signing** SHA-256 into `assetlinks.prepared.json`; authorize deploy of `web/public/.well-known/assetlinks.json`.
5. Complete Data Safety, content rating, ads, audience, AI/UGC declarations.
6. Visually approve feature graphic; capture phone screenshots on a physical device.
7. Run physical-device smoke matrix (`internal-testing-checklist.md`).
8. If personal developer account: plan closed testing per doc 05 before production access.

## 9. Store listing still outstanding

- Phone screenshots from **installed TWA** (min 2) — website viewport captures are interim only
- Visual approval of feature graphic before Console upload

See also: `docs/google-play/final-play-readiness-2026-10-21.md` (Phases 1–7 final checklist).
- Short/full descriptions finalized in Console
- Category / contact email confirmation

## 10. Final readiness status

**READY FOR INTERNAL TESTING**

Meaning: signed AAB + target API 36 + privacy/delete URLs are in place for the owner to start Internal testing upload and Console policy forms.  

**Not** READY FOR CLOSED TESTING completion evidence, **not** READY TO APPLY FOR PRODUCTION ACCESS, **not** READY FOR PRODUCTION SUBMISSION — Digital Asset Links missing, store assets incomplete, Console forms unfinished, no device sign-off, no Play submission performed.
