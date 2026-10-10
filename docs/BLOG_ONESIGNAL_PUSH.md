# Giga3 AI Blog — OneSignal Web Push

Opt-in web push for **new editorial blog articles** on https://www.giga3ai.com/blog/

## Audit summary (Phase 1)

| Topic | Finding |
|-------|---------|
| Blog routes | Static export: `/blog/`, `/blog/[slug]/`, `/blog/category/[categorySlug]/` |
| Publishing | Code-committed posts in `web/lib/blog/postRegistry.ts` + `web/content/blog/*`; live after Cloudflare Pages deploy — **no CMS webhook** |
| PWA service worker | `web/public/sw.js` registered at **scope `/`** by `ServiceWorkerRegister` |
| Existing push | Separate **VAPID / `web-push`** path via Convex (`pushAlerts*`) for news/sports/app alerts — **not** OneSignal |
| Static export | `web/next.config.mjs` → `output: "export"`, `trailingSlash: true` |
| Auto-send on publish | **Not present** — static pages cannot hold a OneSignal REST API key |

### Service-worker compatibility

OneSignal is integrated with a **subdirectory worker** only:

- File: `/push/onesignal/OneSignalSDKWorker.js`
- Scope: `/push/onesignal/`
- Init uses Custom Code `serviceWorkerPath` + `serviceWorkerParam`

This does **not** replace or re-register `/sw.js`. Official guidance: keep PWA and OneSignal on separate scopes ([OneSignal service worker docs](https://documentation.onesignal.com/docs/en/onesignal-service-worker)).

### OneSignal plan notes (verify on dashboard)

Do **not** hardcode limits in product UI. As of OneSignal’s published pricing/FAQ:

- Free plan: web push remains available; Free plan sends are capped at **10,000 subscribers per web push send**.
- Mobile push / in-app Free MAU limits (1,000 MAU from Sep/Oct 2026) do **not** replace web-push send rules — confirm current numbers at https://onesignal.com/pricing and https://documentation.onesignal.com/docs/en/billing-faq before launch.

Browser support: Chromium, Firefox, Edge, Safari (platform-dependent). Private/incognito and some mobile browsers block push — the UI treats these as unsupported.

## Feature flags

Set at **build time** (Pages / `web/.env.local`):

```bash
NEXT_PUBLIC_GIGA3_BLOG_PUSH_ENABLED=true
NEXT_PUBLIC_ONESIGNAL_APP_ID=<uuid-from-onesignal-dashboard>
```

Both required. Invalid/missing App ID → feature stays **off** (component renders nothing).

### Secrets (server only — never `NEXT_PUBLIC_`)

| Secret | Where | Purpose |
|--------|--------|---------|
| OneSignal **REST API Key** | GitHub Actions secret and/or Convex env — **not** the static site | Create notifications after a post ships |

## Reader UX

- Soft prompt on blog index + article layout (`BlogPushSubscribe`)
- Explains: optional alerts for new Giga3 AI articles
- Permission requested only after **Notify me**
- Dismiss / Don’t ask again stored in `localStorage`
- Respects denied / unsupported
- Unsubscribe control when opted in
- Max editorial cadence **policy**: ≤ 1 notification per day (configure in OneSignal campaigns / your sender)

## Enabling in OneSignal dashboard

1. Create a Web app for `https://www.giga3ai.com`
2. Choose **Custom Code** setup
3. Set site URL to `https://www.giga3ai.com`
4. Do **not** point OneSignal at `/sw.js`
5. After deploy of this branch, confirm  
   `https://www.giga3ai.com/push/onesignal/OneSignalSDKWorker.js` returns the `importScripts(...)` line
6. Copy the **App ID** into `NEXT_PUBLIC_ONESIGNAL_APP_ID` and set `NEXT_PUBLIC_GIGA3_BLOG_PUSH_ENABLED=true`
7. Rebuild / redeploy Pages
8. Keep the **REST API Key** only in a secret store

## Publishing / send trigger (remaining backend work)

Blog posts go live via **git merge + Cloudflare Pages**. There is no article “publish” API today.

Recommended next step (not implemented as an active production sender in this PR):

1. Detect new `web/lib/blog/postRegistry.ts` entries in CI after deploy succeeds.
2. Call OneSignal Create Notification with the REST API key from GitHub Actions secrets.
3. Use payload helpers in `web/lib/blog/blogPushNotifyPayload.ts` (title, summary, image, canonical `/blog/{slug}/` URL, brand data, dedupe key).
4. Enforce:
   - HTTPS URL on `www.giga3ai.com` / `giga3ai.com` blog paths only
   - No sends for drafts/previews
   - Dedupe via `blogPushDedupeKey(slug)` (store “already sent” keys)
   - Frequency: at most one editorial campaign per day

Until that pipeline exists, operators can send manually from the OneSignal dashboard to a consenting test segment.

## Privacy

- Voluntary opt-in only
- Copy explains what subscribers receive
- Unsubscribe via UI + browser site settings
- No contact list upload; no silent subscribe
- Align with Giga3 Privacy Policy and OneSignal policies before enabling in production

## Files

| Path | Role |
|------|------|
| `web/public/push/onesignal/OneSignalSDKWorker.js` | OneSignal SW (subdir) |
| `web/lib/blog/blogPushConfig.ts` | Flags + URL validation |
| `web/lib/blog/onesignalClient.ts` | SDK init / subscribe |
| `web/lib/blog/blogPushNotifyPayload.ts` | Server-ready payload helpers |
| `web/components/blog/BlogPushSubscribe.tsx` | Soft opt-in UI |
| `tests/blog/blogPush*.test.ts` | Unit coverage |
