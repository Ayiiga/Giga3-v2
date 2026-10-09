#!/usr/bin/env node
/**
 * Generate Ghana KG2 high-quality visuals via fal.ai (project-supported provider).
 * Writes binaries under web/public/gigalearn/media/ghana/kg2/hq/ and updates
 * web/lib/gigalearn/mediaLibrary/ghanaKg2AssetManifest.generated.json
 *
 * Does NOT invent files on failure — failed assets stay status:"failed" with prompts.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "web/public/gigalearn/media/ghana/kg2/hq");
const MANIFEST_TS = join(
  ROOT,
  "web/lib/gigalearn/mediaLibrary/ghanaKg2AssetManifest.ts"
);
const GENERATED_JSON = join(
  ROOT,
  "web/lib/gigalearn/mediaLibrary/ghanaKg2AssetManifest.generated.json"
);

const key = process.env.FAL_API_KEY?.trim() || process.env.FAL_KEY?.trim();
const model = process.env.FAL_IMAGE_MODEL?.trim() || "fal-ai/flux/schnell";

if (!key) {
  console.error("FAL_API_KEY / FAL_KEY missing — cannot generate images.");
  process.exit(2);
}

/** Minimal parse of the TS manifest assets array via the exported JSON we write after first run,
 * or fall back to reading prompts from a sibling JSON seed. */
function loadPlan() {
  const seedPath = join(
    ROOT,
    "web/lib/gigalearn/mediaLibrary/ghanaKg2AssetManifest.seed.json"
  );
  if (!existsSync(seedPath)) {
    throw new Error(`Missing seed manifest ${seedPath}`);
  }
  return JSON.parse(readFileSync(seedPath, "utf8"));
}

async function falSubmit(prompt, negativePrompt) {
  const res = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: negativePrompt,
      image_size: "square_hd",
      num_images: 1,
      enable_safety_checker: true,
      output_format: "png",
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`fal submit ${res.status}: ${text.slice(0, 400)}`);
  const body = JSON.parse(text);
  if (!body.request_id || !body.status_url || !body.response_url) {
    throw new Error("fal submit missing queue urls");
  }
  return body;
}

async function falWait(statusUrl, responseUrl, maxMs = 180_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const st = await fetch(statusUrl, {
      headers: { Authorization: `Key ${key}` },
    });
    const sj = await st.json();
    if (sj.status === "COMPLETED") {
      const rr = await fetch(responseUrl, {
        headers: { Authorization: `Key ${key}` },
      });
      if (!rr.ok) throw new Error(`fal result ${rr.status}`);
      return rr.json();
    }
    if (sj.status === "FAILED" || sj.status === "CANCELLED") {
      throw new Error(`fal job ${sj.status}: ${JSON.stringify(sj).slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("fal wait timeout");
}

function pickImageUrl(result) {
  return result?.images?.[0]?.url || result?.image?.url || null;
}

async function downloadBinary(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

/** Compress fal PNG/JPEG into WebP under the offline 1.5MB inline-cache limit. */
function toWebp(inputBuf, outPath) {
  const tmp = join(tmpdir(), `gigalearn-hq-${Date.now()}-${Math.random().toString(16).slice(2)}.bin`);
  writeFileSync(tmp, inputBuf);
  try {
    let quality = 82;
    for (let attempt = 0; attempt < 5; attempt++) {
      execFileSync(
        "ffmpeg",
        ["-y", "-i", tmp, "-vf", "scale=1024:1024:force_original_aspect_ratio=decrease", "-c:v", "libwebp", "-quality", String(quality), outPath],
        { stdio: "pipe" }
      );
      const size = readFileSync(outPath).byteLength;
      if (size <= 1_400_000) return;
      quality -= 12;
    }
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const plan = loadPlan();
  const assets = [];

  console.log(`Provider: fal model=${model}`);
  console.log(`Generating ${plan.assets.length} assets into ${OUT_DIR}`);

  for (const asset of plan.assets) {
    const outName = asset.filename.endsWith(".webp") ? asset.filename : `${asset.filename}.webp`;
    const outPath = join(OUT_DIR, outName);
    const publicPath = asset.publicPath.endsWith(".webp")
      ? asset.publicPath
      : asset.publicPath.replace(/\.[a-z]+$/i, ".webp");
    process.stdout.write(`• ${asset.id} … `);
    try {
      const submitted = await falSubmit(asset.generationPrompt, asset.negativePrompt);
      const result = await falWait(submitted.status_url, submitted.response_url);
      const imageUrl = pickImageUrl(result);
      if (!imageUrl) throw new Error("no image url in fal result");
      const raw = await downloadBinary(imageUrl);
      toWebp(raw, outPath);
      const buf = readFileSync(outPath);
      const hash = createHash("sha256").update(buf).digest("hex").slice(0, 16);
      const next = {
        ...asset,
        filename: outName,
        publicPath,
        status: "generated",
        byteLength: buf.byteLength,
        contentHash: hash,
        licensing: {
          ...asset.licensing,
          provider: "fal",
          model,
          generatedAt: new Date().toISOString(),
          reviewed: false,
        },
      };
      assets.push(next);
      console.log(`ok ${buf.byteLength}B sha=${hash}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      assets.push({
        ...asset,
        filename: outName,
        publicPath,
        status: "failed",
        errorMessage: message.slice(0, 500),
      });
      console.log(`FAIL ${message.slice(0, 120)}`);
    }
  }

  const generated = {
    ...plan,
    generatedAt: new Date().toISOString(),
    provider: "fal",
    model,
    assets,
  };
  writeFileSync(GENERATED_JSON, JSON.stringify(generated, null, 2) + "\n");
  console.log(`Wrote ${GENERATED_JSON}`);

  const ok = assets.filter((a) => a.status === "generated").length;
  const fail = assets.length - ok;
  console.log(`Done: ${ok} generated, ${fail} failed`);
  if (ok === 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
