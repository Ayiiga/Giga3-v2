# Digital Asset Links for Giga3 TWA

Trusted Web Activity verification requires **matching** statements in:

1. **Android app** — already embedded in `android/app/src/main/res/values/strings.xml` (`assetStatements`) declaring delegation for `https://www.giga3ai.com`.
2. **Website** — `https://www.giga3ai.com/.well-known/assetlinks.json` listing the app package and **SHA-256 certificate fingerprint**.

## Current status

| Item | Status |
|------|--------|
| App package | `com.giga3ai.app` (configured in TWA project) |
| Site delegation in app | Configured for `https://www.giga3ai.com` |
| **SHA-256 fingerprint in `assetlinks.json`** | **PARTIAL** — upload-key SHA-256 is known locally; **Play App Signing** SHA-256 still required from Play Console |
| Production `assetlinks.json` deployed | **NO** — `https://www.giga3ai.com/.well-known/assetlinks.json` still **404** (do not deploy placeholders) |

## What you must provide

After you create or register the **upload/signing certificate** (see `docs/google-play/signing.md`):

1. Obtain the **SHA-256** fingerprint of the certificate that signs the APK/AAB uploaded to Play (often the **Play App Signing** app signing key certificate, or upload key — follow [Google’s TWA verification guide](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start#step-5-generate-and-sign-an-apk)).
2. Approve publishing `assetlinks.json` to production.

Example structure (replace `REPLACE_WITH_SHA256_FINGERPRINT` — **do not use a placeholder in production**):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.giga3ai.app",
      "sha256_cert_fingerprints": [
        "REPLACE_WITH_SHA256_FINGERPRINT"
      ]
    }
  }
]
```

Deploy target path when approved:

`web/public/.well-known/assetlinks.json`

Then redeploy Cloudflare Pages (existing workflow). Verify with:

`https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.giga3ai.com&relation=delegate_permission/common.handle_all_urls`

## Template file

A non-production template is kept at:

`docs/google-play/assetlinks.template.json`

**Do not copy the template to `web/public/` until the fingerprint is real.**

## Status (2026-10-21)

Production check: `https://www.giga3ai.com/.well-known/assetlinks.json` → **404**.  
Upload-key SHA-256 is filled in `assetlinks.prepared.json`; Play App Signing SHA-256 still `PASTE_*`.  
**TWA domain verification is not complete.** Final checklist: `final-play-readiness-2026-10-21.md`.

### Which SHA-256 to use

| Certificate | Where you get it | When it matters |
|-------------|------------------|-----------------|
| **Play App Signing key** | Play Console → Setup → App signing → *App signing key certificate* | **Required** for Play-installed builds (users get this cert) |
| **Upload key** | Same page → *Upload key certificate*, or `keytool -list -v` on `upload-keystore.jks` | Signs the AAB you upload; may also be listed in assetlinks if you sideload upload-signed APKs |
| **Android debug key** | `~/.android/debug.keystore` | Debug APK sideloads only — never treat as production |

Prepared JSON: `docs/google-play/assetlinks.prepared.json`

- Slot 1: `PASTE_PLAY_APP_SIGNING_CERT_SHA256_HERE` — replace with Play Console **App signing key certificate** SHA-256 after first upload / App Signing enrollment.
- Slot 2: upload-key SHA-256 from the local `upload-keystore.jks` (filled 2026-10-21) — useful for upload-signed sideloads; **not** a substitute for the Play App Signing cert on Play-installed builds.

For local debug installs only, the Android debug keystore SHA-256 observed in this Cloud Agent was:

`2B:BE:F1:14:2A:BB:36:DA:70:19:AE:F7:CC:97:7E:53:4C:F6:60:54:80:10:F3:10:36:F2:97:70:38:52:A6:FE`

Do **not** publish the debug fingerprint as the production Play App Signing certificate.  
Do **not** copy `assetlinks.prepared.json` to `web/public/` until the Play App Signing `PASTE_*` token is replaced with a real fingerprint.

Owner action list: `docs/google-play/next-owner-actions.md`
