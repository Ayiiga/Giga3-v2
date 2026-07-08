/**
 * Generates Giga3 AI PWA branding assets (icons, favicons, splash screens, logo).
 * Pure Node.js — no native image dependencies.
 *
 * Run: node scripts/generate-branding.mjs
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const iconsDir = join(publicDir, "icons");
const splashDir = join(publicDir, "splash");
const imagesDir = join(publicDir, "images");
const frontendIconsDir = join(__dirname, "..", "..", "frontend", "assets", "icons");
const frontendImagesDir = join(__dirname, "..", "..", "frontend", "assets", "images");

/** Bump when icons/splash change — keeps browsers and PWAs off stale assets. */
const BRAND_ASSET_VERSION = "20260703";

const BRAND = {
  name: "Giga3 AI",
  shortName: "Giga3",
  description:
    "Intelligent conversations at scale — modern AI chat, writing, and media with credits & subscriptions.",
  themeColor: "#5b21b6",
  backgroundColor: "#ffffff",
  /** Solid violet — single background color for app icons. */
  violet: [91, 33, 182],
  white: [255, 255, 255],
  splashTop: [250, 250, 252],
  splashBottom: [245, 243, 255],
};

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function isInRoundedRect(x, y, w, h, r) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const rr = Math.min(r, w / 2, h / 2);
  if (x < rr && y < rr) return dist(x, y, rr, rr) <= rr;
  if (x > w - rr && y < rr) return dist(x, y, w - rr, rr) <= rr;
  if (x < rr && y > h - rr) return dist(x, y, rr, h - rr) <= rr;
  if (x > w - rr && y > h - rr) return dist(x, y, w - rr, h - rr) <= rr;
  return true;
}

/** Bold sans-serif capital G in normalized coords (origin at center). */
function isOnBoldG(nx, ny) {
  const r = Math.hypot(nx, ny);
  const deg = (Math.atan2(ny, nx) * 180) / Math.PI;

  const innerR = 0.27;
  const outerR = 0.5;
  const onArc = r >= innerR && r <= outerR && deg >= 45 && deg <= 315;

  const onBar = nx >= -0.1 && nx <= 0.34 && Math.abs(ny) <= 0.13;

  const onStem = nx >= 0.2 && nx <= 0.5 && ny >= -0.08 && ny <= 0.38;

  return onArc || onBar || onStem;
}

function setSolidViolet(pixels, i) {
  pixels[i] = BRAND.violet[0];
  pixels[i + 1] = BRAND.violet[1];
  pixels[i + 2] = BRAND.violet[2];
  pixels[i + 3] = 255;
}

function setWhite(pixels, i) {
  pixels[i] = BRAND.white[0];
  pixels[i + 1] = BRAND.white[1];
  pixels[i + 2] = BRAND.white[2];
  pixels[i + 3] = 255;
}

function renderIcon(size, { maskable = false, splash = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const pad = maskable ? size * 0.1 : 0;
  const cx = size / 2;
  const cy = size / 2;
  const markScale = size * (maskable ? 0.36 : splash ? 0.22 : 0.42);
  const cornerR = size * (splash ? 0 : 0.22);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      if (splash) {
        const t = y / Math.max(1, size - 1);
        const bg = lerpColor(BRAND.splashTop, BRAND.splashBottom, t);
        pixels[i] = bg[0];
        pixels[i + 1] = bg[1];
        pixels[i + 2] = bg[2];
        pixels[i + 3] = 255;

        const nx = (x - cx) / markScale;
        const ny = (y - cy) / markScale;
        const r = Math.hypot(nx, ny);
        if (r <= 0.58) {
          setSolidViolet(pixels, i);
        }
        if (isOnBoldG(nx, ny)) {
          setWhite(pixels, i);
        }
        continue;
      }

      const inShape = maskable
        ? true
        : isInRoundedRect(x, y, size, size, cornerR);

      if (!inShape) {
        pixels[i + 3] = 0;
        continue;
      }

      if (maskable) {
        const inSafe =
          x >= pad && y >= pad && x < size - pad && y < size - pad;
        if (!inSafe) {
          setWhite(pixels, i);
          continue;
        }
      }

      setSolidViolet(pixels, i);

      const nx = (x - cx) / markScale;
      const ny = (y - cy) / markScale;
      if (isOnBoldG(nx, ny)) {
        setWhite(pixels, i);
      }
    }
  }

  return pixels;
}

function encodePng(size, pixelBuffer) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    pixelBuffer.copy(row, 1, y * size * 4, (y + 1) * size * 4);
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodePngRect(width, height, pixelBuffer) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    pixelBuffer.copy(row, 1, y * width * 4, (y + 1) * width * 4);
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function renderSplash(width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height * 0.38;
  const markScale = Math.min(width, height) * 0.2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const t = y / Math.max(1, height - 1);
      const bg = lerpColor(BRAND.splashTop, BRAND.splashBottom, t);
      pixels[i] = bg[0];
      pixels[i + 1] = bg[1];
      pixels[i + 2] = bg[2];
      pixels[i + 3] = 255;

      const nx = (x - cx) / markScale;
      const ny = (y - cy) / markScale;
      const r = Math.hypot(nx, ny);

      if (r <= 0.58) {
        pixels[i] = BRAND.violet[0];
        pixels[i + 1] = BRAND.violet[1];
        pixels[i + 2] = BRAND.violet[2];
      }

      if (isOnBoldG(nx, ny)) {
        pixels[i] = BRAND.white[0];
        pixels[i + 1] = BRAND.white[1];
        pixels[i + 2] = BRAND.white[2];
      }
    }
  }

  const textScale = Math.max(3, Math.round(Math.min(width, height) / 220));
  const titleY = cy + markScale * 1.35;
  drawText(pixels, width, height, "Giga3 AI", cx, titleY, textScale, BRAND.violet);

  const tagScale = Math.max(2, textScale - 1);
  const tagY = titleY + textScale * 10;
  drawText(pixels, width, height, "Intelligent AI", cx, tagY, tagScale, BRAND.violet);

  return pixels;
}

/** 5x7 bitmap glyphs (5 bits per row, MSB left). */
const FONT_5X7 = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  G: [0x0f, 0x10, 0x17, 0x11, 0x11, 0x11, 0x0f],
  I: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x1f],
  a: [0x00, 0x00, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  g: [0x00, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  i: [0x04, 0x00, 0x0c, 0x04, 0x04, 0x04, 0x0e],
  l: [0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  n: [0x00, 0x00, 0x16, 0x19, 0x11, 0x11, 0x11],
  t: [0x04, 0x04, 0x0e, 0x04, 0x04, 0x04, 0x03],
  e: [0x00, 0x00, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  3: [0x0e, 0x11, 0x02, 0x04, 0x02, 0x11, 0x0e],
};

function drawGlyph(pixels, width, height, originX, originY, scale, glyph, color) {
  const rows = FONT_5X7[glyph];
  if (!rows) return;
  for (let row = 0; row < rows.length; row++) {
    const bits = rows[row];
    for (let col = 0; col < 5; col++) {
      if ((bits >> (4 - col)) & 1) {
        const x0 = Math.floor(originX + col * scale);
        const y0 = Math.floor(originY + row * scale);
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const x = x0 + dx;
            const y = y0 + dy;
            if (x < 0 || y < 0 || x >= width || y >= height) continue;
            const i = (y * width + x) * 4;
            pixels[i] = color[0];
            pixels[i + 1] = color[1];
            pixels[i + 2] = color[2];
            pixels[i + 3] = 255;
          }
        }
      }
    }
  }
}

function drawText(pixels, width, height, text, centerX, baseY, scale, color) {
  const charAdvance = 6 * scale;
  const totalWidth = text.length * charAdvance - scale;
  let x = centerX - totalWidth / 2;
  for (const ch of text) {
    drawGlyph(pixels, width, height, x, baseY, scale, ch, color);
    x += charAdvance;
  }
}

function writeIco(png16, png32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(2, 4);

  const entry = (png, size, offset) => {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0;
    e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    return e;
  };

  const offset1 = 6 + 16 * 2;
  const offset2 = offset1 + png16.length;

  return Buffer.concat([
    header,
    entry(png16, 16, offset1),
    entry(png32, 32, offset2),
    png16,
    png32,
  ]);
}

const ICON_SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512];

const SPLASH_SCREENS = [
  ["iphone-se", 640, 1136],
  ["iphone-8", 750, 1334],
  ["iphone-8-plus", 1242, 2208],
  ["iphone-x", 1125, 2436],
  ["iphone-12", 1170, 2532],
  ["iphone-14-plus", 1284, 2778],
  ["iphone-14-pro-max", 1290, 2796],
  ["ipad", 1536, 2048],
  ["ipad-pro-11", 1668, 2388],
  ["ipad-pro-12", 2048, 2732],
];

const FAVICON_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Giga3 AI">
  <rect width="512" height="512" rx="112" fill="#5b21b6"/>
  <path fill="#ffffff" d="M 356 178 A 104 104 0 1 0 356 334 L 300 334 A 48 48 0 0 1 300 256 L 356 256 L 356 226 L 268 226 A 88 88 0 0 1 268 178 Z"/>
</svg>
`;

function buildManifest() {
  const icons = [];

  for (const size of ICON_SIZES) {
    icons.push({
      src: `/icons/icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any",
    });
  }

  icons.push({
    src: "/icons/icon-maskable-192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "maskable",
  });
  icons.push({
    src: "/icons/icon-maskable-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  });

  return {
    id: "/",
    name: BRAND.name,
    short_name: BRAND.shortName,
    description: BRAND.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "window-controls-overlay"],
    orientation: "portrait-primary",
    background_color: BRAND.backgroundColor,
    theme_color: BRAND.themeColor,
    categories: ["productivity", "utilities"],
    lang: "en",
    dir: "ltr",
    prefer_related_applications: false,
    icons,
    shortcuts: [
      {
        name: "Chat",
        short_name: "Chat",
        description: "Open Giga3 AI chat",
        url: "/chat/",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Video AI",
        short_name: "Video",
        description: "Video AI studio",
        url: "/video/",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Marketplace",
        short_name: "Shop",
        description: "Digital marketplace",
        url: "/marketplace/",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "GigaLearn",
        short_name: "Learn",
        description: "AI learning studio for students and teachers",
        url: "/gigalearn/",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "GigaSocial",
        short_name: "Social",
        description: "AI-powered community feed",
        url: "/gigasocial/",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "GigaWallet",
        short_name: "Wallet",
        description: "Credits, subscriptions, and billing",
        url: "/wallet/",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}

await mkdir(iconsDir, { recursive: true });
await mkdir(splashDir, { recursive: true });
await mkdir(imagesDir, { recursive: true });

for (const size of ICON_SIZES) {
  const pixels = renderIcon(size);
  const png = encodePng(size, pixels);
  const name = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
  await writeFile(join(iconsDir, name), png);
  if (size === 180) {
    await writeFile(join(iconsDir, "icon-180.png"), png);
  }
}

for (const maskSize of [192, 512]) {
  const pixels = renderIcon(maskSize, { maskable: true });
  await writeFile(
    join(iconsDir, `icon-maskable-${maskSize}.png`),
    encodePng(maskSize, pixels)
  );
}

const logoPixels = renderIcon(512);
await writeFile(join(imagesDir, "logo.png"), encodePng(512, logoPixels));

const favicon16 = encodePng(16, renderIcon(16));
const favicon32 = encodePng(32, renderIcon(32));
await writeFile(join(publicDir, "favicon.ico"), writeIco(favicon16, favicon32));
await writeFile(join(iconsDir, "favicon-16.png"), favicon16);
await writeFile(join(iconsDir, "favicon-32.png"), favicon32);
await writeFile(join(publicDir, "favicon.svg"), FAVICON_SVG);

for (const [name, w, h] of SPLASH_SCREENS) {
  const pixels = renderSplash(w, h);
  await writeFile(join(splashDir, `${name}.png`), encodePngRect(w, h, pixels));
}

const manifest = buildManifest();
const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
await writeFile(join(publicDir, "manifest.json"), manifestJson);
await writeFile(join(publicDir, "manifest.webmanifest"), manifestJson);

await mkdir(frontendIconsDir, { recursive: true });
await mkdir(frontendImagesDir, { recursive: true });
const logoPath = join(imagesDir, "logo.png");
await copyFile(logoPath, join(frontendImagesDir, "logo.png"));
await copyFile(logoPath, join(frontendImagesDir, "logo-square.png"));
await copyFile(join(iconsDir, "icon-192.png"), join(frontendIconsDir, "icon-192.png"));
await copyFile(join(iconsDir, "icon-512.png"), join(frontendIconsDir, "icon-512.png"));
await copyFile(
  join(iconsDir, "apple-touch-icon.png"),
  join(frontendIconsDir, "apple-touch-icon.png")
);

await writeFile(
  join(publicDir, "branding-version.txt"),
  `${BRAND_ASSET_VERSION}\n`
);

console.log("Generated Giga3 AI branding assets:");
console.log(`  version: ${BRAND_ASSET_VERSION}`);
console.log(`  icons: ${ICON_SIZES.length + 2} PNGs in public/icons/`);
console.log("  logo: public/images/logo.png");
console.log("  favicon: public/favicon.ico, favicon.svg");
console.log(`  splash: ${SPLASH_SCREENS.length} screens in public/splash/`);
console.log("  manifest: public/manifest.json");
console.log("  legacy frontend: frontend/assets/{images,icons}/ synced");
