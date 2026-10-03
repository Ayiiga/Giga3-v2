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

Requires approved signing configuration. See `docs/google-play/signing.md`. **Do not commit keystores.**

```bash
./gradlew bundleRelease
```

## Permissions (AndroidManifest)

| Permission | Reason |
|------------|--------|
| `POST_NOTIFICATIONS` | Web Push delegation (Android 13+) |

Camera, microphone, and location are requested at **runtime by the website** via Web APIs; location delegation uses `android-browser-helper:locationdelegation`.

## Documentation

- `docs/google-play/billing-policy-review.md`
- `docs/google-play/digital-asset-links.md`
- `docs/google-play/google-sign-in-android.md`
- `docs/google-play/signing.md`
- `docs/google-play/release-checklist.md`

## Play Store

**Not submitted.** Internal testing requires Digital Asset Links + signing setup by the project owner.
