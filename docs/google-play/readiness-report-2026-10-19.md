# Android / Google Play readiness report — 2026-10-19

## Deliverables

| Item | Path / status |
|------|----------------|
| Android project | `android/` (Bubblewrap TWA, package `com.giga3ai.app`) |
| Debug APK | `android/app/build/outputs/apk/debug/app-debug.apk` (also `/opt/cursor/artifacts/android-twa/app-debug.apk`) |
| Release AAB | `android/app/build/outputs/bundle/release/app-release.aab` (also `/opt/cursor/artifacts/android-twa/app-release.aab`) — **unsigned for Play** until upload keystore configured |
| DAL template | `docs/google-play/assetlinks.template.json` |
| Audit | `docs/google-play/pwa-android-audit-2026-10-19.md` |
| Store draft | `docs/google-play/store-listing-draft.md` |

### Validated build metadata (debug APK)

```
package: com.giga3ai.app
versionCode: 1
versionName: 1.0.0
minSdk: 21
targetSdk: 36
compileSdk: 36
application-label: Giga3 AI
launchable-activity label: Giga3
uses-permission: POST_NOTIFICATIONS
(no ACCESS_FINE/COARSE_LOCATION after locationDelegation disabled)
```

Debug signing cert SHA-256 (local testing only — **not** for production DAL):

`2B:BE:F1:14:2A:BB:36:DA:70:19:AE:F7:CC:97:7E:53:4C:F6:60:54:80:10:F3:10:36:F2:97:70:38:52:A6:FE`

## Google Play target API

Verified from Play Console Help / Android Developers (fetched 2026-10-19):

- From **31 August 2026**, new apps and updates must target **Android 16 (API 36)+** (with platform exceptions for Wear/TV/etc.).
- This project sets `compileSdkVersion` / `targetSdkVersion` **36**.

## Digital Asset Links

**Not verified.** Production `/.well-known/assetlinks.json` returns **404**. Google statements API reports fetch error.

Owner actions required:

1. Create upload keystore; enable Play App Signing.
2. Collect **Play App Signing** cert SHA-256 (and upload key if needed).
3. Publish `assetlinks.json` at `https://www.giga3ai.com/.well-known/assetlinks.json` (site deploy).
4. Re-check statements API + device TWA (no Chrome custom-tab URL bar).

## Android device testing

| Attempt | Result |
|---------|--------|
| Headless AVD `giga3_twa_api34` | Started qemu with KVM after group fix; **adb stayed `offline`** for >10 minutes — install/UI tests not completed |
| Physical device | Not available in this environment |

**Do not claim packaged-app UX verified.** APK/AAB were validated with `aapt` / file presence only. Owner should install `app-debug.apk` on a device after DAL is live.

## Build commands

```bash
export ANDROID_HOME=$HOME/Android/Sdk   # or your SDK path
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
cd android
./gradlew assembleDebug      # → app/build/outputs/apk/debug/app-debug.apk
./gradlew bundleRelease      # → app/build/outputs/bundle/release/app-release.aab
```

Signing for Play: see `docs/google-play/signing.md` (`signing.properties` gitignored).

## Secrets policy

- No keystores, passwords, or private keys committed.
- `android/.gitignore` excludes `*.jks`, `*.keystore`, `signing.properties`, `*.apk`, `*.aab`, `local.properties`.

## Not done (by design / blockers)

- No website deploy.
- No Google Play upload/publish.
- No production DAL publish.
- No Play-signed release AAB (needs owner credentials).
- No successful emulator/device smoke of the installed package.
