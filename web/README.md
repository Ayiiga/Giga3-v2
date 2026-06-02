# Giga3 AI — Next.js Web

Production-ready marketing site for **Giga3 AI**, built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and the **App Router**.

## Stack

- Next.js 14 (static export for Cloudflare Pages)
- TypeScript, Tailwind CSS
- PWA: `manifest.webmanifest`, service worker, install button, offline page
- Mobile-first, dark mode by default

## Project structure

```
web/
├── app/              # App Router pages & layout
├── components/       # UI, layout, sections, PWA
├── hooks/            # PWA install, online status
├── lib/              # Site config, utilities
├── public/           # Static assets, SW, manifest, icons
├── scripts/          # Icon generator (prebuild)
└── styles/           # Global CSS
```

## Development

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build (Cloudflare Pages)

```bash
cd web
npm install
npm run build
```

Output directory: **`web/out/`** (static export).

### Cloudflare Pages settings

| Setting | Value |
|--------|--------|
| Build command | `cd web && npm install && npm run build` |
| Build output directory | `web/out` |
| Node.js version | 20.x |

`public/_headers` is copied into `out/` on build for caching and security headers.

## PWA

- **Manifest:** `public/manifest.webmanifest`
- **Service worker:** `public/sw.js` (precaches shell routes and caches static assets)
- **Install:** `InstallButton` uses `beforeinstallprompt` where supported
- **Offline:** `/offline/` fallback; `OfflineBanner` when the browser is offline

Icons are generated before build via `npm run prebuild` → `public/icons/`.

## Environment

No env vars required for the marketing site. App links point to the existing Giga3 app URLs in `lib/site.ts`.
