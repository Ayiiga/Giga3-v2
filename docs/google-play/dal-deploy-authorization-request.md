# Digital Asset Links — intended production change (awaiting authorization)

## Current production

`GET https://www.giga3ai.com/.well-known/assetlinks.json` → **HTTP 404**

## Intended static-export path

```
web/public/.well-known/assetlinks.json
```

(This directory already hosts `security.txt`. Cloudflare Pages serves `web/out` from the static export.)

## Intended file contents (structure only)

Fingerprints must come from Play Console **after** the first signed AAB upload with Play App Signing enabled. Until then, **do not deploy**.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.giga3ai.app",
      "sha256_cert_fingerprints": [
        "<PLAY_APP_SIGNING_CERT_SHA256>",
        "<OPTIONAL_UPLOAD_OR_DEBUG_SHA256>"
      ]
    }
  }
]
```

Working copy with paste tokens: `docs/google-play/assetlinks.prepared.json`

## Authorization required

Reply with explicit approval to deploy **after** you paste verified SHA-256 values into the prepared file, for example:

> Authorize Cloudflare Pages deploy of `web/public/.well-known/assetlinks.json` with Play App Signing fingerprint `…`.

Without that approval and without real fingerprints, the agent will not create or deploy a production `assetlinks.json`.

## Post-deploy verification (agent will run after authorization)

```bash
curl -sI https://www.giga3ai.com/.well-known/assetlinks.json
curl -s "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.giga3ai.com&relation=delegate_permission/common.handle_all_urls"
```
