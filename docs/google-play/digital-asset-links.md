# Digital Asset Links for Giga3 TWA

Trusted Web Activity verification requires **matching** statements in:

1. **Android app** — already embedded in `android/app/src/main/res/values/strings.xml` (`assetStatements`) declaring delegation for `https://www.giga3ai.com`.
2. **Website** — `https://www.giga3ai.com/.well-known/assetlinks.json` listing the app package and **SHA-256 certificate fingerprint**.

## Current status

| Item | Status |
|------|--------|
| App package | `com.giga3ai.app` (configured in TWA project) |
| Site delegation in app | Configured for `https://www.giga3ai.com` |
| **SHA-256 fingerprint in `assetlinks.json`** | **NOT CONFIGURED** — no production signing certificate exists yet |
| Production `assetlinks.json` deployed | **NO** — do not deploy until fingerprint is real |

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
