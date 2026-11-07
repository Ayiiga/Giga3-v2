# Giga3 AI — Alpha testing release status (2026-10-25)

**Track:** Closed testing — Alpha  
**Package:** `com.giga3ai.app`  
**Production:** `https://www.giga3ai.com/`  
**Africa/Accra:** 2026-10-25 ~13:45 UTC (= Accra)

## Acceptance summary

| Criterion | Result |
| --- | --- |
| Highest Play versionCode confirmed | **3** (owner Play Console Alpha screenshots; versionName `1.0.2`). VersionCode **2** previously uploaded. A newer unseen upload **cannot be ruled out** without live Console/API access. |
| Final AAB | `/opt/cursor/artifacts/android-play-testing-aab-2026-10-25/giga3ai-v1.0.4-code5.aab` |
| versionCode / versionName | **5** / **1.0.4** (manifest + aapt verified) |
| SHA-256 | `ba8b5fdb5b8689d5d7aba2554d33de028594c09599e5de6fa611a3ab371560d5` |
| Signature | `jarsigner -verify` → **jar verified** (PKIX warning expected for self-signed upload cert) |
| Upload cert SHA-256 | `69:2B:C8:C3:2A:58:2E:7C:02:B6:7A:98:9E:D4:1B:88:37:2C:BD:0A:50:05:0B:F0:6A:08:6B:5F:CB:C4:6F:97` |
| TWA launch URL / host | `https://www.giga3ai.com/` / `www.giga3ai.com` |
| Digital Asset Links HTTP | **404** — file not published (Play App Signing SHA missing) |
| DAL Content-Type | N/A until published; Cloudflare `_headers` rule prepared for `application/json` |
| Google statements API | `ERROR_CODE_FETCH_ERROR` (404) |
| Cloudflare DAL deploy | **Not deployed** — blocked on App Signing fingerprint |
| Device/emulator install | **Unverified** — no USB device; AVD stays `adb offline` |
| Play upload / Alpha change / rollout | **None performed** |

## Version gate

| Evidence | Highest versionCode |
| --- | --- |
| Owner Alpha screenshots (stated) | **3** (`1.0.2`) |
| Authenticated Play Console / Publisher API | **Unavailable** in this environment |
| Local handoff AABs (not Play Console) | Highest local file is code **5**; code **4** exists locally but is **not** confirmed on Play |

**Decision:** Preserve candidate **versionCode 5**. It is greater than the screenshot-confirmed Play maximum (3). No rebuild required. Before upload, owner should glance at App bundle explorer once more; if any code ≥ 5 already exists on Play, stop and request a bump.

## Digital Asset Links — sole remaining external blocker

| Item | Status |
| --- | --- |
| Intended path | `web/public/.well-known/assetlinks.json` → static export → Cloudflare Pages |
| Path proven live | `/.well-known/security.txt` → HTTP **200** (same directory mechanism) |
| Prepared template | `docs/google-play/assetlinks.prepared.json` (still `PASTE_PLAY_APP_SIGNING_CERT_SHA256_HERE`) |
| Play App Signing SHA-256 | **Missing** — cannot be derived from upload keystore; must come from Play Console → Setup → App signing |
| Placeholder / guess published? | **No** |

Required value (one line):

`PLAY_APP_SIGNING_CERT_SHA256=<colon-separated SHA-256 from App signing key certificate>`

After that value is provided, the authorized next step is:

1. Replace `PASTE_*` in the prepared file (keep upload-key fingerprint as optional second entry).  
2. Copy to `web/public/.well-known/assetlinks.json`.  
3. Merge to `main` so Cloudflare Pages deploys.  
4. Verify HTTP 200 + `Content-Type: application/json` + Google statements API.

## AAB reuse (no rebuild)

Existing candidate matches all package checks. Rebuild skipped.

Mirror: `android-signing-handoff/giga3ai-v1.0.4-code5.aab`

## Device test limitation

| Runtime | Result |
| --- | --- |
| USB Android device | None attached (`adb devices` empty) |
| Emulator `giga3_twa_api34` | Known Cloud Agent failure: QEMU starts, `emulator-5554` remains **offline** |

Static/bundle checks only. Do not claim TWA fullscreen UX verified.

## Safety confirmations

- No AAB uploaded to Google Play  
- Alpha track not changed  
- No rollout started or promoted  
- App-signing / upload keystore not replaced  
- No placeholder DAL published  
- Unrelated app functionality not modified  

## Owner action (single ask)

Paste the **App signing key certificate** SHA-256 from Play Console → Setup → App signing (or set secret `PLAY_APP_SIGNING_CERT_SHA256`). Everything else for Alpha upload prep is ready.
