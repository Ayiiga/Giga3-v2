# GigaEdits UX prototype (isolated)

Mobile-first **Create Home** + **Quick Edit** layout exploration after P0.

This folder is **outside** `web/app`. It is not a Next.js route and must not appear in Cloudflare Pages `out/`.

## Preview locally

From the repo root:

```bash
python3 -m http.server 8765 --directory web/prototypes/gigaedits-ux
```

Open `http://localhost:8765/` (try 390×844 and 360px wide).

## What this is / is not

- **Is:** Visual + interaction prototype with mock media and honest “Export does not write a file” messaging.
- **Is not:** A replacement for `/gigaedit`, IndexedDB projects, trim math, caption persistence, or the export engine.

## Files

| File | Role |
|------|------|
| `index.html` | Standalone Create Home + Quick Edit |
| `proto.css` | Deep navy + violet tokens (aligned with `--ge-*`) |
| `proto.js` | Screen navigation + mock import/undo |
| `GigaEditsUxPrototype.tsx` | React mirror for unit tests only |
