# Giga3 Creator Academy PDFs

Four official series sold on `/marketplace` at **GHS 150.00** each.

Regenerate:

```bash
cd web && npm run generate:creator-series-pdfs
```

Publish into Convex storage + listings (after Pages deploy):

```bash
npx convex run marketplaceSeed:seedGiga3CreatorSeries '{"adminKey":"…"}'
```

Public paths here are used by the seed action to fetch bytes into `_storage`. Marketplace CTAs should send buyers through Paystack purchase + **My purchases**, not direct free download links.
