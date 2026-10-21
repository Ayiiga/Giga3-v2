# Exact next owner actions (no auto-deploy / no auto-upload)

Stop conditions: do **not** deploy the website, upload to Play, or publish until you explicitly authorize each step.

Authoritative status: `docs/google-play/final-play-readiness-2026-10-21.md`

## Already done (do not redo)

- Upload keystore exists: `android/upload-keystore.jks`, alias `android` (gitignored).
- Signed release AAB builds with existing signing:  
  `android/app/build/outputs/bundle/release/app-release.aab`  
  and downloadable `android-signing-handoff/app-release-play-ready.aab`  
  (`jarsigner` → jar verified; versionCode **2**, versionName **1.0.1**, minSdk **24**, targetSdk **36**, package **`com.giga3ai.app`**).
- Signing backup: `android-signing-handoff/Giga3AI-Android-Backup.zip` (gitignored; keep offline).
- Upload-key SHA-256 recorded in `docs/google-play/assetlinks.prepared.json`.
- Feature graphic file prepared at `docs/google-play/assets/feature-graphic-1024x500.png`.
- Privacy / delete-account URLs live under `/legal/…`.

## 1) Confirm package ID in Play Console

1. Open Google Play Console → Create app (or open existing).
2. Confirm application ID is exactly `com.giga3ai.app`.

## 2) Upload signed AAB (Internal testing) — needs approval

Use the verified AAB (do not regenerate a new keystore):

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Enable **Play App Signing** on first upload.

## 3) Complete Digital Asset Links (blocked until App Signing SHA exists)

1. Play Console → **Setup → App signing** → copy **App signing key certificate** SHA-256.
2. Edit `docs/google-play/assetlinks.prepared.json`:
   - Replace `PASTE_PLAY_APP_SIGNING_CERT_SHA256_HERE` with that value (colon-separated).
   - Keep the upload-key fingerprint for sideload testing if desired.
3. After explicit deploy authorization, copy to:

   `web/public/.well-known/assetlinks.json`

4. Deploy via the normal Cloudflare Pages workflow.
5. Verify:

```bash
curl -sI https://www.giga3ai.com/.well-known/assetlinks.json
curl -s "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.giga3ai.com&relation=delegate_permission/common.handle_all_urls"
```

**Do not** publish the `PASTE_*` placeholder.

## 4) Device smoke (physical required)

Cloud Agent: no Android device/emulator attached (`adb devices` empty). Use a physical device after Internal testing install or sideload:

- Confirm fullscreen TWA only after DAL is live with the **installed** build’s signing cert.
- Exercise login, navigation, external links, keyboard, offline/error, GigaLearn flows.
- Capture genuine phone screenshots from the installed app (replace website viewport PNGs).

## 5) Store listing + Console declarations

- Upload icon 512×512 and feature graphic 1024×500 (visually approve first).
- Replace interim website screenshots with device captures (min 2 phone).
- Complete Data Safety, content rating, ads, audience, app access / reviewer account.
- Draft copy: `docs/google-play/store-listing-draft.md`.

## 6) Production publish

Requires separate explicit authorization. Not performed by the agent.
