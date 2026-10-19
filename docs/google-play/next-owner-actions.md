# Exact next owner actions (no auto-deploy)

Stop conditions: do **not** deploy the website, upload to Play, or publish until you explicitly authorize each step.

## 1) Confirm package ID in Play Console

1. Open Google Play Console → Create app (or open existing).
2. Confirm application ID is exactly `com.giga3ai.app`.
3. Public store URL currently returns **404** for that ID — treat as *likely unused*, not a reservation guarantee.

## 2) Create upload keystore (local only)

On a trusted machine (not this Cloud Agent unless you deliberately choose to):

```bash
cd android
keytool -genkeypair -v \
  -keystore upload-keystore.jks \
  -alias android \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype PKCS12
```

Then:

```bash
cp signing.properties.example signing.properties
# fill storeFile / passwords / keyAlias
./gradlew bundleRelease
```

Verify signing:

```bash
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab | tail
```

Current Cloud Agent AAB is **unsigned** (`jarsigner`: “jar is unsigned”).

## 3) Enable Play App Signing

1. First AAB upload (Internal testing) with Play App Signing enabled.
2. In **Setup → App signing**, copy:
   - **App signing key certificate** SHA-256 ← required for production TWA / Digital Asset Links
   - **Upload key certificate** SHA-256 ← used to sign what you upload

## 4) Publish Digital Asset Links (needs deploy approval)

1. Edit `docs/google-play/assetlinks.prepared.json`:
   - Replace `PASTE_PLAY_APP_SIGNING_CERT_SHA256_HERE` with the **App signing** SHA-256 (colon-separated).
   - Optionally keep upload/debug fingerprints only for sideload testing.
2. After explicit deploy authorization, copy to:

   `web/public/.well-known/assetlinks.json`

3. Deploy via the normal Cloudflare Pages workflow.
4. Verify:

```bash
curl -sI https://www.giga3ai.com/.well-known/assetlinks.json
curl -s "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.giga3ai.com&relation=delegate_permission/common.handle_all_urls"
```

**Do not** publish the template’s `REPLACE_WITH_SHA256_FINGERPRINT` or the prepared file’s `PASTE_*` placeholders.

## 5) Device smoke (physical recommended)

Cloud Agent limitation: headless emulator reaches TCP 5554/5555 but stays **`adb offline`** (guest adbd never becomes ready). Use a physical Android device:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.giga3ai.app/.LauncherActivity
```

Check fullscreen TWA (no Chrome custom-tab URL bar) only after DAL is live with the **installed** APK’s signing cert (debug cert for debug APK).

## 6) Store listing assets

Still outstanding:

- Feature graphic **1024×500**
- Phone screenshots (capture after real device TWA session)
- Data safety / content rating / reviewer test account

Draft copy: `docs/google-play/store-listing-draft.md`

## 7) Upload / publish

Requires separate explicit authorization. Not performed by the agent.
