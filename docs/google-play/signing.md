# Android signing — Giga3 TWA

## Rules enforced in this repository

- **No keystores committed** (`*.jks`, `*.keystore`, `android.keystore`)
- **No passwords in source control**
- **`signing.properties` is gitignored** — use `signing.properties.example` as a template only
- **No automatic production key generation** in CI or scripts
- **`twa-manifest.json`** references `./android.keystore` as Bubblewrap convention — file is **never** created in this repo

Gradle release signing is wired in `android/app/release-signing.gradle` and applied from `android/app/build.gradle`.

---

## Debug builds

```bash
cd android
./gradlew assembleDebug
```

Uses the automatic **debug keystore** (local-only, not for Play upload).

Output: `android/app/build/outputs/apk/debug/app-debug.apk` (gitignored)

---

## Release builds (Play upload)

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab` (gitignored)

When signing credentials are **not** configured, Gradle logs:

> Giga3 release signing: not configured … bundleRelease will produce an unsigned AAB.

An unsigned AAB cannot be uploaded to Google Play until signed.

---

## Step 1 — Create upload keystore (owner, local machine)

**STOP:** Do not generate a permanent production upload key without owner approval. Store backups in a secrets manager.

Recommended: enable **Google Play App Signing** in Play Console so Google holds the app signing key; you retain an **upload key**.

```bash
cd android
keytool -genkeypair -v \
  -keystore upload-keystore.jks \
  -alias android \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype PKCS12
```

You will be prompted for:

- Keystore password
- Key password (can match keystore password)
- Distinguished name fields (organization, country, etc.)

**Protect:** `upload-keystore.jks`, both passwords, and the alias. Never commit the `.jks` file.

Alternative: generate an upload key from **Play Console → Setup → App signing** and download the certificate.

---

## Step 2 — Configure Gradle (choose one method)

### Option A — `signing.properties` (recommended for local builds)

```bash
cp signing.properties.example signing.properties
# Edit signing.properties with real values
```

Example `android/signing.properties`:

```properties
storeFile=upload-keystore.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=android
keyPassword=YOUR_KEY_PASSWORD
```

`storeFile` is relative to the **`android/`** directory unless you use an absolute path.

### Option B — Environment variables (CI or scripted builds)

| Variable | Required | Description |
|----------|----------|-------------|
| `GIGA3_ANDROID_KEYSTORE_PATH` | Yes | Path to `.jks` / `.keystore` |
| `GIGA3_ANDROID_KEYSTORE_PASSWORD` | Yes | Keystore password |
| `GIGA3_ANDROID_KEY_ALIAS` | No | Default: `android` |
| `GIGA3_ANDROID_KEY_PASSWORD` | No | Defaults to keystore password |

Example:

```bash
export GIGA3_ANDROID_KEYSTORE_PATH="/secure/path/upload-keystore.jks"
export GIGA3_ANDROID_KEYSTORE_PASSWORD="…"
export GIGA3_ANDROID_KEY_ALIAS="android"
export GIGA3_ANDROID_KEY_PASSWORD="…"
cd android && ./gradlew bundleRelease
```

---

## Step 3 — Obtain SHA-256 for Digital Asset Links

After the keystore exists, extract the certificate fingerprint:

```bash
keytool -list -v \
  -keystore upload-keystore.jks \
  -alias android
```

Copy the **SHA-256** line (colon-separated hex). Use this in `assetlinks.json` — see `digital-asset-links.md`.

**Play App Signing note:** If Google re-signs your app, you may need the **app signing certificate** SHA-256 from Play Console (Setup → App signing → App signing key certificate), not only the upload key. Follow [Chrome TWA verification guidance](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start).

---

## Google Play App Signing (recommended)

1. Create the app in Play Console with package `com.giga3ai.app`.
2. Opt in to **Play App Signing** on first upload.
3. Google stores the app signing key; you sign uploads with your upload key.
4. Download encryption key backup when offered.
5. Register upload key SHA-256 in Digital Asset Links if that is the certificate Chrome verifies for your build track.

---

## What must remain secret

| Asset | Never commit | Notes |
|-------|--------------|-------|
| Upload keystore (`.jks`) | ✓ | Backup offline |
| Keystore password | ✓ | |
| Key alias password | ✓ | |
| `signing.properties` | ✓ | Gitignored |
| Play Console credentials | ✓ | Use 2FA |
| `CONVEX_DEPLOY_KEY`, Paystack keys | ✓ | Unrelated to Android; still protected |

---

## CI safety

- Repository **does not** include a workflow that uploads signed AABs with embedded secrets.
- Do not add keystore files or passwords to GitHub Actions secrets unless you operate a dedicated, access-controlled release pipeline.
- `local.properties` (SDK path) is gitignored — each developer/CI agent sets it locally.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `bundleRelease` unsigned | Create `signing.properties` or set `GIGA3_ANDROID_KEYSTORE_*` env vars |
| Keystore path not found | Use absolute path or place `.jks` under `android/` |
| Wrong SHA-256 in assetlinks | Use fingerprint from the certificate that actually signs the installed APK |
| Bubblewrap asks for keystore | Ignore for Play path; use Gradle `bundleRelease` instead |

Bubblewrap interactive signing (`bubblewrap init`) was **skipped intentionally**. Use Gradle release signing for Play uploads.
