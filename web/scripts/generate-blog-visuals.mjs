#!/usr/bin/env node
/**
 * Offline blog visual generation via fal.ai flux/schnell (same primary path as Media Studio).
 * Reviews belong in git — do not call at page runtime.
 *
 * Usage (from web/):
 *   FAL_API_KEY=… node scripts/generate-blog-visuals.mjs
 *   FAL_API_KEY=… node scripts/generate-blog-visuals.mjs --only=best-ai-tools-ghana
 */
import { createWriteStream } from "node:fs";
import { mkdir, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/images/blog");
const FAL_QUEUE = "https://queue.fal.run";
const MODEL = "fal-ai/flux/schnell";

const STYLE =
  "Documentary editorial photography, natural light, photorealistic, West African / Ghana setting, " +
  "authentic everyday scene, no text overlay, no watermark, no logos, no brand names on screens, " +
  "no UI mockups of real apps, shallow depth of field, professional magazine quality";

const NEGATIVE =
  "cartoon, illustration, anime, 3d render, text, watermark, logo, brand name, " +
  "deformed hands, extra fingers, blurry, low quality, stock photo watermark";

/** @type {{ id: string, file: string, prompt: string, size?: string }[]} */
const ASSETS = [
  // Featured heroes (16:9)
  {
    id: "best-ai-tools-ghana",
    file: "best-ai-tools-ghana.jpg",
    prompt: `${STYLE}. Young Ghanaian professionals and students around a wooden table with laptops and phones in an Accra café, discussing digital tools, warm afternoon light through windows.`,
  },
  {
    id: "bece-wassce-ai",
    file: "bece-wassce-ai.jpg",
    prompt: `${STYLE}. Ghanaian senior high school students in school uniforms studying together with notebooks and a shared laptop in a bright classroom, focused exam preparation mood.`,
  },
  {
    id: "top-ai-apps-ghana",
    file: "top-ai-apps-ghana.jpg",
    prompt: `${STYLE}. Close-up of a young Ghanaian adult using a smartphone and earbud on a trotro-adjacent street bench, modern Accra vibe, productive mobile workflow.`,
  },
  {
    id: "wassce-2026-results",
    file: "wassce-2026-results.jpg",
    prompt: `${STYLE}. Ghanaian student and parent sitting together at home reviewing printed papers and a phone, hopeful but thoughtful expressions, soft indoor light.`,
  },
  {
    id: "ghana-wage-system",
    file: "ghana-wage-system.jpg",
    prompt: `${STYLE}. Everyday Ghanaian workers and market scene suggesting livelihoods — a young clerk at a desk with a calculator and ledger, Accra office with open window, honest documentary tone.`,
  },
  {
    id: "one-million-coders",
    file: "one-million-coders.jpg",
    prompt: `${STYLE}. Diverse young Ghanaians learning to code on laptops in a community tech hub, whiteboard with simple diagrams in background (no readable text), energetic mentorship moment.`,
  },
  {
    id: "ai-tools-students-2026",
    file: "ai-tools-students-2026.jpg",
    prompt: `${STYLE}. University student in Ghana studying at a library desk with textbooks, laptop, and handwritten notes, concentration and calm determination.`,
  },
  {
    id: "ai-for-teachers",
    file: "ai-for-teachers.jpg",
    prompt: `${STYLE}. Ghanaian teacher preparing lessons at a classroom desk after school, lesson notes, chalk dust soft light, caring professional atmosphere.`,
  },
  {
    id: "wassce-ai-study",
    file: "wassce-ai-study.jpg",
    prompt: `${STYLE}. Solo Ghanaian SHS student revising maths under a desk lamp at night, notebook open, phone face-down, disciplined study scene.`,
  },
  {
    id: "ai-hustle-ghana",
    file: "ai-hustle-ghana.jpg",
    prompt: `${STYLE}. Young Ghanaian creator filming short content with a phone on a small tripod in a modest home workspace, ring light subtle, entrepreneurial energy.`,
  },
  {
    id: "digital-literacy-social",
    file: "digital-literacy-social.jpg",
    prompt: `${STYLE}. Young adults in Ghana looking thoughtfully at a smartphone together, verifying information online, living-room setting, digital literacy mood.`,
  },
  {
    id: "african-youth-ai-jobs",
    file: "african-youth-ai-jobs.jpg",
    prompt: `${STYLE}. Group of African youth collaborating on laptops outdoors near a campus courtyard, future-of-work optimism, natural daylight.`,
  },
  {
    id: "ghana-ai-future",
    file: "ghana-ai-future.jpg",
    prompt: `${STYLE}. Accra skyline at golden hour with young professionals walking with backpacks, blend of tradition and modern tech city energy, wide documentary frame.`,
  },
  {
    id: "chatgpt-gemini-claude-comparison-ghana",
    file: "chatgpt-gemini-claude-comparison-ghana.jpg",
    prompt: `${STYLE}. Three Ghanaian students comparing notes on different laptops at a shared table, thoughtful discussion, no brand logos on screens (blank soft glow).`,
  },
  {
    id: "make-money-ai-ghana-2026",
    file: "make-money-ai-ghana-2026.jpg",
    prompt: `${STYLE}. Young Ghanaian freelancer delivering work on a laptop in a small co-working space, notebook with client checklist, entrepreneurial confidence.`,
  },
  {
    id: "africa-ai-solves-real-problems",
    file: "africa-ai-solves-real-problems.jpg",
    prompt: `${STYLE}. Practical scene of African students and a mentor solving a real study problem with a laptop in a community library, grounded and hopeful, not futuristic hype.`,
  },
  // Shared supporting visuals
  {
    id: "support-students-group-study",
    file: "support-students-group-study.jpg",
    prompt: `${STYLE}. Three Ghanaian students revising together with shared textbooks and sticky notes, classroom afternoon light.`,
    size: "landscape_4_3",
  },
  {
    id: "support-teacher-planning",
    file: "support-teacher-planning.jpg",
    prompt: `${STYLE}. Close documentary shot of a Ghanaian teacher's hands arranging printed worksheets and a laptop for lesson planning.`,
    size: "landscape_4_3",
  },
  {
    id: "support-mobile-learning",
    file: "support-mobile-learning.jpg",
    prompt: `${STYLE}. Ghanaian student learning from a smartphone on a bus seat with earphones, mobile-first education reality.`,
    size: "landscape_4_3",
  },
  {
    id: "support-creator-editing",
    file: "support-creator-editing.jpg",
    prompt: `${STYLE}. Ghanaian creator editing video on a laptop in a tidy home desk, phone propped as second screen, focused craft.`,
    size: "landscape_4_3",
  },
  {
    id: "support-small-business-phone",
    file: "support-small-business-phone.jpg",
    prompt: `${STYLE}. Ghanaian shop owner using a smartphone for business messages beside products on a counter, SME digital skills.`,
    size: "landscape_4_3",
  },
  {
    id: "support-coding-mentorship",
    file: "support-coding-mentorship.jpg",
    prompt: `${STYLE}. Mentor pointing at a laptop screen while a young Ghanaian learner smiles, coding bootcamp atmosphere.`,
    size: "landscape_4_3",
  },
  {
    id: "support-fact-check-moment",
    file: "support-fact-check-moment.jpg",
    prompt: `${STYLE}. Person pausing before sharing a post on a phone, thoughtful expression, living room in Ghana, digital safety theme.`,
    size: "landscape_4_3",
  },
  {
    id: "support-campus-opportunity",
    file: "support-campus-opportunity.jpg",
    prompt: `${STYLE}. Graduates and undergraduates networking outdoors on a Ghanaian campus, career conversation, bright daylight.`,
    size: "landscape_4_3",
  },
  {
    id: "ai-freelance-services-ghana",
    file: "ai-freelance-services-ghana.jpg",
    prompt: `${STYLE}. Freelancer in Ghana on a video call with a client on laptop, notepad with service packages, professional home office.`,
    size: "landscape_4_3",
  },
  {
    id: "ai-seven-day-start-plan-ghana",
    file: "ai-seven-day-start-plan-ghana.jpg",
    prompt: `${STYLE}. Desk flat-lay with weekly planner notebook, pen, phone and laptop in Accra apartment, starting a seven-day work plan, no readable text.`,
    size: "landscape_4_3",
  },
  {
    id: "ai-study-writing-comparison-ghana",
    file: "ai-study-writing-comparison-ghana.jpg",
    prompt: `${STYLE}. Student writing an essay draft by hand while a laptop sits open nearby, Ghana university desk, study-and-writing balance.`,
    size: "landscape_4_3",
  },
  {
    id: "ai-creator-coding-comparison-ghana",
    file: "ai-creator-coding-comparison-ghana.jpg",
    prompt: `${STYLE}. Split documentary mood: one person sketching content ideas in a notebook, another writing simple code on a laptop, same Ghana co-working room.`,
    size: "landscape_4_3",
  },
  {
    id: "blog-hero",
    file: "blog-hero.jpg",
    prompt: `${STYLE}. Wide editorial hero of young Africans learning and creating with technology in Accra, hopeful and grounded.`,
  },
  // Phase 2 — coding & AI skills series
  {
    id: "start-learning-coding-ghana",
    file: "start-learning-coding-ghana.jpg",
    prompt: `${STYLE}. Absolute beginner in Ghana learning to code on a laptop at a simple wooden desk, notebook with sketched flowboxes (no readable text), calm focused morning light.`,
  },
  {
    id: "one-million-coders-courses-careers",
    file: "one-million-coders-courses-careers.jpg",
    prompt: `${STYLE}. Young Ghanaian graduates discussing career paths after digital skills training, laptops closed on table, campus courtyard, practical career conversation.`,
  },
  {
    id: "ai-skills-ghanaian-students-2026",
    file: "ai-skills-ghanaian-students-2026.jpg",
    prompt: `${STYLE}. Ghanaian university students practising prompt writing and note-taking together, laptops and exercise books, library corner, skill-building mood.`,
  },
  {
    id: "coding-vs-ai-beginners",
    file: "coding-vs-ai-beginners.jpg",
    prompt: `${STYLE}. Two young learners in Ghana at one desk — one writing simple code on a laptop, the other drafting prompts in a notebook, comparing learning paths, friendly debate.`,
  },
  {
    id: "first-software-project-ghana",
    file: "first-software-project-ghana.jpg",
    prompt: `${STYLE}. Beginner developer in Accra celebrating a small working app on a phone and laptop, sticky notes for project steps, home desk, first-project pride.`,
  },
  {
    id: "support-coding-practice-desk",
    file: "support-coding-practice-desk.jpg",
    prompt: `${STYLE}. Close documentary shot of hands typing on a laptop with a water bottle and phone charging, Ghana home study desk, daily coding practice.`,
    size: "landscape_4_3",
  },
  {
    id: "support-skills-roadmap-notebook",
    file: "support-skills-roadmap-notebook.jpg",
    prompt: `${STYLE}. Open notebook with simple hand-drawn roadmap boxes (no readable words) beside a laptop, planning digital skills journey in Ghana.`,
    size: "landscape_4_3",
  },
  {
    id: "support-team-project-build",
    file: "support-team-project-build.jpg",
    prompt: `${STYLE}. Small student team in Ghana building a first software project around one laptop, pointing at the screen, collaborative energy.`,
    size: "landscape_4_3",
  },
];

function getKey() {
  return process.env.FAL_API_KEY?.trim() || process.env.FAL_KEY?.trim() || "";
}

function parseOnly() {
  const arg = process.argv.find((a) => a.startsWith("--only="));
  if (!arg) return null;
  return new Set(
    arg
      .slice("--only=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function falSubmit(prompt, imageSize) {
  const key = getKey();
  const res = await fetch(`${FAL_QUEUE}/${MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: NEGATIVE,
      image_size: imageSize || "landscape_16_9",
      num_inference_steps: 4,
      enable_safety_checker: true,
      num_images: 1,
    }),
  });
  if (!res.ok) {
    throw new Error(`fal submit ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const body = await res.json();
  if (!body.request_id || !body.status_url || !body.response_url) {
    throw new Error("fal submit missing queue urls");
  }
  return body;
}

async function falWait(statusUrl, responseUrl, timeoutMs = 180_000) {
  const key = getKey();
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${key}` },
    });
    if (!statusRes.ok) {
      throw new Error(`fal status ${statusRes.status}`);
    }
    const status = await statusRes.json();
    if (status.status === "COMPLETED") {
      const resultRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${key}` },
      });
      if (!resultRes.ok) throw new Error(`fal result ${resultRes.status}`);
      return resultRes.json();
    }
    if (status.status === "FAILED") {
      throw new Error(`fal failed: ${JSON.stringify(status).slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  throw new Error("fal wait timeout");
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function optimizeJpeg(inputPath, outputPath) {
  try {
    const sharp = (await import("sharp")).default;
    await sharp(inputPath)
      .rotate()
      .resize({ width: 1600, height: 900, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(outputPath + ".tmp");
    const { rename, unlink } = await import("node:fs/promises");
    await rename(outputPath + ".tmp", outputPath);
    if (inputPath !== outputPath) {
      try {
        await unlink(inputPath);
      } catch {
        /* keep raw if unlink fails */
      }
    }
  } catch (err) {
    // sharp optional — leave downloaded file as-is
    if (inputPath !== outputPath) {
      const { copyFile } = await import("node:fs/promises");
      await copyFile(inputPath, outputPath);
    }
    console.warn("sharp optimize skipped:", err.message);
  }
}

async function generateOne(asset, { force = false } = {}) {
  const outPath = join(OUT_DIR, asset.file);
  if (!force && (await exists(outPath))) {
    console.log(`skip existing ${asset.file}`);
    return { id: asset.id, skipped: true };
  }
  console.log(`generate ${asset.id}…`);
  const submitted = await falSubmit(asset.prompt, asset.size);
  const result = await falWait(submitted.status_url, submitted.response_url);
  const url = result?.images?.[0]?.url || result?.image?.url;
  if (!url) throw new Error(`no image url for ${asset.id}`);
  const rawPath = join(OUT_DIR, `${asset.id}.raw.bin`);
  await download(url, rawPath);
  await optimizeJpeg(rawPath, outPath);
  console.log(`wrote ${asset.file}`);
  return { id: asset.id, skipped: false, file: asset.file };
}

async function main() {
  if (!getKey()) {
    console.error("FAL_API_KEY or FAL_KEY required");
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });
  const only = parseOnly();
  const force = process.argv.includes("--force");
  const list = only ? ASSETS.filter((a) => only.has(a.id)) : ASSETS;
  const results = [];
  for (const asset of list) {
    try {
      results.push(await generateOne(asset, { force }));
    } catch (err) {
      console.error(`FAIL ${asset.id}:`, err.message);
      results.push({ id: asset.id, error: err.message });
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  await writeFile(
    join(OUT_DIR, "generation-manifest.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        model: MODEL,
        results,
      },
      null,
      2
    )
  );
  const failed = results.filter((r) => r.error);
  if (failed.length) {
    console.error(`${failed.length} failed`);
    process.exit(1);
  }
  console.log(`done: ${results.length} assets`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
