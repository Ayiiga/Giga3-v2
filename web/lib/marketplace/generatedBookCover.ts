/**
 * Deterministic SVG "cover page" for ebooks when no seller cover is stored.
 * Not fabricated photography — a titled cover plate so the preview is never blank.
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTitle(title: string, maxChars = 22, maxLines = 5): string[] {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (words.join(" ").length > lines.join(" ").length) {
    const last = lines[lines.length - 1] ?? "";
    lines[lines.length - 1] = `${last.replace(/\s+\S*$/, "")}…`;
  }
  return lines.slice(0, maxLines);
}

export function buildGeneratedBookCoverSvg(opts: {
  title: string;
  category?: string | null;
  productType?: string | null;
}): string {
  const lines = wrapTitle(opts.title || "Untitled ebook");
  const subtitle = (opts.category || opts.productType || "Ebook").toUpperCase();
  const textNodes = lines
    .map((line, i) => {
      const y = 210 + i * 36;
      return `<text x="48" y="${y}" fill="#F8FAFC" font-family="Georgia, 'Times New Roman', serif" font-size="28" font-weight="700">${escapeXml(line)}</text>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" role="img" aria-label="${escapeXml(opts.title)} cover">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#064E3B"/>
      <stop offset="55%" stop-color="#0F766E"/>
      <stop offset="100%" stop-color="#134E4A"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#bg)"/>
  <rect x="28" y="28" width="544" height="744" rx="18" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
  <text x="48" y="88" fill="#A7F3D0" font-family="system-ui,sans-serif" font-size="14" font-weight="700" letter-spacing="3">${escapeXml(subtitle)}</text>
  ${textNodes}
  <text x="48" y="720" fill="#D1FAE5" font-family="system-ui,sans-serif" font-size="16" font-weight="600">Giga3 Marketplace</text>
  <text x="48" y="748" fill="rgba(209,250,229,0.8)" font-family="system-ui,sans-serif" font-size="13">Cover page · upload a custom cover anytime</text>
</svg>`;
}

export function generatedBookCoverDataUrl(opts: {
  title: string;
  category?: string | null;
  productType?: string | null;
}): string {
  const svg = buildGeneratedBookCoverSvg(opts);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
