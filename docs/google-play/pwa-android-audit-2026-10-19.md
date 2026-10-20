# Phase 1 — PWA & Android audit (2026-10-19)

Fetched production `https://www.giga3ai.com/` and inspected repo `Ayiiga/Giga3-v2` @ `main` tip plus existing branch `cursor/android-twa-b549` (PR #454).

## Existing Android wrapper

| Finding | Detail |
|---------|--------|
| Present? | **Yes** — Bubblewrap TWA under `android/` (PR #454) |
| Package ID | `com.giga3ai.app` |
| Host | `www.giga3ai.com` |
| Decision | **Reuse** — do not create a second Android project |

Play Store lookup for `id=com.giga3ai.app` returned HTTP **404** (no public listing found). Final package reservation still requires Play Console confirmation by the owner.

## Production PWA checklist

| # | Check | Result |
|---|--------|--------|
| 1 | Web app manifest | `https://www.giga3ai.com/manifest.webmanifest` **200** (`application/manifest+json`); same payload at `/manifest.json` |
| 2 | Name / short name | `name`: **Giga3 AI**; `short_name`: **Giga3 AI** (web). Android launcher label configured as **Giga3** |
| 3 | Start URL / scope | `start_url`: `/`; `scope`: `/`; `display`: `standalone` |
| 4 | Icons | 16→512 PNG + maskable 192/512 under `/icons/`; live 512 OK |
| 5 | Theme / background | `theme_color` `#7C3AED`; `background_color` `#0A0A0F` |
| 6 | HTTPS | Site serves HTTPS (Cloudflare) |
| 7 | Service worker | `/sw.js` **200**; `CACHE_VERSION = giga3-v45`; `/offline.html` **200** |
| 8 | Mobile routes | `/`, `/chat/`, `/gigalearn/`, `/gigasocial/`, `/gigaedit/`, `/marketplace/` all **200** (Android UA) |
| 9 | Auth / session | Cookie/session JWT flows remain on the website (TWA does not replace auth) |
| 10 | Android/TWA config | Present in `android/` (this workstream reuses it) |
| 11 | Deep links / routing | App Links intent filters for `https://www.giga3ai.com` in `AndroidManifest.xml`; **DAL not live yet** |

## Digital Asset Links (production)

| Check | Result |
|-------|--------|
| `https://www.giga3ai.com/.well-known/assetlinks.json` | **404** |
| Google statements API | Error: unavailable / 404 fetching statements |
| TWA verification | **Not complete** — do not claim verified |

## Gaps addressed in this branch

- Disabled Android location delegation (removed `ACCESS_FINE/COARSE_LOCATION` from the APK).
- Confirmed `compileSdk` / `targetSdk` **36** (Play requirement from **2026-08-31** for new apps/updates).
- Version name set to **1.0.0**.
- Built and validated debug APK + release AAB artifacts (see readiness report).

## Remaining owner blockers

1. Upload keystore + Play App Signing certificate SHA-256.
2. Deploy real `assetlinks.json` to production (requires site deploy authorization).
3. Emulator/device smoke of installed APK (Cloud Agent emulator stayed `adb offline`).
4. Play Console listing assets (feature graphic 1024×500, screenshots) and policy forms.
