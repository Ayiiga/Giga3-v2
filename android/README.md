# Giga3 AI — Android Trusted Web Activity (TWA)

Thin Android shell for [Giga3 AI](https://www.giga3ai.com/). Loads the **production PWA** over HTTPS. Does not bundle the Next.js app.

| Setting | Value |
|---------|--------|
| Application ID | `com.giga3ai.app` |
| Origin | `https://www.giga3ai.com/` |
| Start URL | `/` |
| Generator | [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) |

## Prerequisites

- JDK 17+ (JDK 21 works for debug builds)
- Android SDK (set `ANDROID_HOME`)
- Node.js (for regenerating from manifest)

## Regenerate project (after web manifest/icon changes)

```bash
cd android
npm install --legacy-peer-deps
node scripts/generate-project.mjs
```

Then rebuild.

## Debug build

```bash
cd android
# Create local.properties with: sdk.dir=/path/to/Android/Sdk
./gradlew assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

## Release build

Requires owner-approved signing configuration. **Do not commit keystores or `signing.properties`.**

1. Copy `signing.properties.example` → `signing.properties` (gitignored) and fill in values, **or** set `GIGA3_ANDROID_KEYSTORE_*` environment variables.
2. Build:

```bash
./gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

Without signing credentials, Gradle produces an **unsigned** AAB (not Play-uploadable).

See `docs/google-play/signing.md` and `docs/google-play/android-release-process.md`.

## Permissions (AndroidManifest)

| Permission | Reason |
|------------|--------|
| `POST_NOTIFICATIONS` | Web Push delegation (Android 13+) |

Camera, microphone, and location are requested at **runtime by the website** via Web APIs; location delegation uses `android-browser-helper:locationdelegation`.

## Documentation

- `docs/google-play/android-release-process.md` — end-to-end Play release
- `docs/google-play/internal-testing-checklist.md` — device test matrix
- `docs/google-play/signing.md` — keystore and Gradle signing
- `docs/google-play/digital-asset-links.md` — TWA verification
- `docs/google-play/billing-policy-review.md` — Paystack preservation / Play policy
- `docs/google-play/release-checklist.md` — store listing and policy forms
- `docs/google-play/google-sign-in-android.md` — OAuth for Android

## Play Store

**Not submitted.** Internal testing requires Digital Asset Links + signing setup by the project owner.
