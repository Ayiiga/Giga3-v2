/**
 * Generates PWA icons without external image dependencies.
 * Uses a minimal uncompressed PNG encoder for solid-color icons with a simple "G" motif.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");

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
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(size, maskable = false) {
  const pad = maskable ? Math.floor(size * 0.1) : 0;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const i = 1 + x * 4;
      const cx = x - size / 2;
      const cy = y - size / 2;
      const r = size * (maskable ? 0.38 : 0.42);
      const inCircle = cx * cx + cy * cy < r * r;
      const inPad =
        x < pad || y < pad || x >= size - pad || y >= size - pad;

      if (maskable && inPad) {
        row[i] = 5;
        row[i + 1] = 5;
        row[i + 2] = 8;
        row[i + 3] = 255;
      } else if (inCircle) {
        row[i] = 124;
        row[i + 1] = 92;
        row[i + 2] = 255;
        row[i + 3] = 255;
      } else if (!maskable && (x < 2 || y < 2)) {
        row[i] = 5;
        row[i + 1] = 5;
        row[i + 2] = 8;
        row[i + 3] = 255;
      } else {
        row[i] = 5;
        row[i + 1] = 5;
        row[i + 2] = 8;
        row[i + 3] = maskable ? 255 : 0;
      }
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw);

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

await mkdir(outDir, { recursive: true });
const sizes = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
  ["apple-touch-icon.png", 180, false],
];

for (const [name, size, maskable] of sizes) {
  await writeFile(join(outDir, name), createPng(size, maskable));
}

console.log("Generated PWA icons in public/icons/");
