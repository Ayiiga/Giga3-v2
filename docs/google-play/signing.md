# Android signing — Giga3 TWA

## Rules enforced in this repo

- **No keystores committed**
- **No passwords in source**
- `android.keystore` is listed in `android/.gitignore`
- `twa-manifest.json` references `./android.keystore` as Bubblewrap convention only — file is **not** created in CI

## Debug builds

`./gradlew assembleDebug` uses the automatic **debug keystore**. Suitable for local/emulator testing only.

Debug APK output: `android/app/build/outputs/apk/debug/app-debug.apk` (gitignored)

## Production / Play upload (requires your approval)

**STOP:** Do not generate a permanent production upload key without owner approval.

Recommended approach:

1. **Google Play App Signing** — Google holds the app signing key; you manage an **upload key**.
2. Create upload keystore locally or via Play Console key generation.
3. Store keystore and passwords in a **secrets manager** (not git).
4. Extract **SHA-256** for Digital Asset Links (see `digital-asset-links.md`).
5. Sign release AAB: `./gradlew bundleRelease` with signing config supplied via environment or `signing.properties` (gitignored).

## What the owner must protect

| Asset | Notes |
|-------|--------|
| Upload keystore (`.jks` / `.keystore`) | Required for each Play upload if using manual signing |
| Keystore passwords | Never commit |
| Play Console access | 2FA recommended |
| Play App Signing recovery | Download encryption key backup from Console when offered |

Bubblewrap can create a keystore interactively (`bubblewrap init`); this was **skipped** intentionally.
