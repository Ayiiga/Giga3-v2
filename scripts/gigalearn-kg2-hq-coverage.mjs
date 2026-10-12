#!/usr/bin/env node
/**
 * Write Ghana KG2 visual coverage report from catalog shards + HQ manifest.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HQ = join(ROOT, "web/public/gigalearn/media/ghana/kg2/hq");
const OUT = join(ROOT, "web/lib/gigalearn/mediaLibrary/ghanaKg2VisualCoverageReport.json");
const OUT_MD = join(ROOT, "web/lib/gigalearn/mediaLibrary/GHANA_KG2_VISUAL_COVERAGE.md");

function loadArray(file) {
  const src = readFileSync(file, "utf8");
  const start = src.indexOf("= [");
  if (start < 0) throw new Error(`No array export in ${file}`);
  let body = src.slice(start + 2).trim().replace(/;$/, "");
  body = body.replace(/\s+as\s+LearningMediaItem\[\]\s*$/, "");
  return JSON.parse(body);
}

function classify(item) {
  const t = `${item.subject} ${item.topic} ${item.title} ${item.discoverCategory}`.toLowerCase();
  // Word-boundary aware: avoid matching "count" inside "countries".
  if (
    /\b(fruit|fruits|food|foods|mango|pawpaw|banana|bananas|plantain|jollof|cocoa|palm|orange|pineapple|apple|coconut|rice|banku|fufu)\b/.test(
      t
    )
  )
    return "fruitsFoods";
  if (
    /\b(animal|animals|goat|chicken|cow|dog|cat|sheep|bird|fish|lion|zebra|hen)\b/.test(t)
  )
    return "animals";
  if (/\b(body|sense|senses|eye|ear|nose|hand|mouth|touch|smell|taste)\b/.test(t))
    return "bodySenses";
  if (
    /\b(colour|color|colours|colors|shape|shapes|size|pattern|circle|square|triangle)\b/.test(t)
  )
    return "coloursShapes";
  if (/\b(alphabet|letter|letters|phonic|phonics|a-z|abc)\b/.test(t)) return "alphabetPhonics";
  if (
    /\b(number|numbers|counting|numeracy|math|maths|addition|subtraction|money|cedi|pesewa)\b/.test(
      t
    ) ||
    item.discoverCategory === "games" ||
    item.discoverCategory === "numbers-letters"
  )
    return "numbersMath";
  if (
    /\b(teacher|nurse|farmer|mechanic|market|cook|police|firefighter|occupation|occupations|helper|helpers|weaver|fisher|carpenter|blacksmith|seamstress|potter)\b/.test(
      t
    )
  )
    return "communityOccupations";
  if (
    /\b(kente|drum|culture|craft|crafts|stool|pottery|basket|flag|story|stories|ananse|rhyme|rhymes|song|songs|poem)\b/.test(
      t
    ) ||
    ["african-stories", "culture-occupations", "rhymes-poems", "songs"].includes(
      item.discoverCategory
    )
  )
    return "cultureCrafts";
  if (
    /\b(environment|plant|plants|transport|bus|car|boat|tree|farm|village|river|ghana)\b/.test(t)
  )
    return "environments";
  if (
    /\b(school|household|table|chair|book|pencil|pen|bag|house|key|jug|cup|object|objects)\b/.test(
      t
    ) ||
    item.discoverCategory === "pictures-objects"
  )
    return "schoolHousehold";
  return "other";
}

const phase1 = [
  {
    id: "pic-mango-kg2",
    title: "Mango",
    levels: ["KG2"],
    discoverCategory: "pictures-objects",
    subject: "Our World",
    topic: "Fruits",
    posterImage: { url: "/gigalearn/media/ghana/kg2/hq/mango.webp" },
  },
  {
    id: "pic-pawpaw-kg2",
    title: "Pawpaw",
    levels: ["KG2"],
    discoverCategory: "pictures-objects",
    subject: "Our World",
    topic: "Fruits",
    posterImage: { url: "/gigalearn/media/ghana/kg2/hq/pawpaw.webp" },
  },
  {
    id: "pic-drum-kg2",
    title: "Talking drum",
    levels: ["KG2"],
    discoverCategory: "culture-occupations",
    subject: "Creative Arts",
    topic: "Musical instruments",
    posterImage: { url: "/gigalearn/media/ghana/kg2/hq/talking-drum.webp" },
  },
  {
    id: "game-count-bananas-kg2",
    title: "Count the bananas",
    levels: ["KG2"],
    discoverCategory: "games",
    subject: "Numeracy",
    topic: "Counting 1–10",
    posterImage: { url: "/gigalearn/media/ghana/kg2/hq/bananas-four.webp" },
  },
  {
    id: "rhyme-mango-sweet",
    title: "Mango Sweet",
    levels: ["KG2"],
    discoverCategory: "rhymes-poems",
    subject: "Language",
    topic: "Nursery rhymes",
    posterImage: { url: "/gigalearn/media/ghana/kg2/hq/mango.webp" },
  },
  {
    id: "story-ananse-listen",
    title: "Ananse listens",
    levels: ["KG2"],
    discoverCategory: "african-stories",
    subject: "Language",
    topic: "Stories",
    posterImage: { url: "/gigalearn/media/ghana/kg2/hq/ananse-listens.webp" },
  },
  {
    id: "culture-kente-intro",
    title: "Kente cloth",
    levels: ["KG2"],
    discoverCategory: "culture-occupations",
    subject: "Our World",
    topic: "Crafts",
    posterImage: { url: "/gigalearn/media/ghana/kg2/hq/kente.webp" },
  },
  {
    id: "country-ghana-profile",
    title: "Ghana",
    levels: ["KG2"],
    discoverCategory: "culture-occupations",
    subject: "Our World",
    topic: "Countries",
  },
];

const shards = [
  "pictures",
  "games",
  "rhymes",
  "songs",
  "stories",
  "videos",
  "culture",
].flatMap((name) =>
  loadArray(join(ROOT, `web/lib/gigalearn/mediaLibrary/catalog.ghana.${name}.ts`)).map((i) => ({
    ...i,
    _shard: name,
  }))
);

const expansion = loadArray(
  join(ROOT, "web/lib/gigalearn/mediaLibrary/catalog.ghana.kg2Expansion.ts")
).map((i) => ({ ...i, _shard: "kg2Expansion" }));

const kg2 = [
  ...phase1,
  ...expansion,
  ...shards.filter((i) => (i.levels || []).includes("KG2")),
];
// de-dupe by id
const byId = new Map();
for (const item of kg2) byId.set(item.id, item);
const items = [...byId.values()];

const generated = existsSync(
  join(ROOT, "web/lib/gigalearn/mediaLibrary/ghanaKg2AssetManifest.generated.json")
)
  ? JSON.parse(
      readFileSync(
        join(ROOT, "web/lib/gigalearn/mediaLibrary/ghanaKg2AssetManifest.generated.json"),
        "utf8"
      )
    )
  : { assets: [] };

const hqOnDisk = new Set(
  existsSync(HQ) ? readdirSync(HQ).filter((f) => f.endsWith(".webp")) : []
);

function posterOk(item) {
  if (!item.posterImage?.url) return false;
  const file = join(ROOT, "web/public", item.posterImage.url.replace(/^\//, ""));
  return existsSync(file);
}

const withHq = items.filter((i) => posterOk(i));
const placeholders = items.filter((i) => !posterOk(i));
const awaitingReview = (generated.assets || []).filter((a) => a.status === "generated");

const byGroup = {};
for (const item of items) {
  const g = classify(item);
  if (!byGroup[g]) byGroup[g] = { total: 0, withHq: 0, placeholders: [] };
  byGroup[g].total += 1;
  if (posterOk(item)) byGroup[g].withHq += 1;
  else byGroup[g].placeholders.push({ id: item.id, title: item.title, category: item.discoverCategory });
}

const report = {
  collectionId: "ghana-kg2-hq-v2",
  generatedAt: new Date().toISOString(),
  totals: {
    kg2CatalogItems: items.length,
    withSuitableHqVisuals: withHq.length,
    remainingPlaceholders: placeholders.length,
    hqWebpFilesOnDisk: hqOnDisk.size,
    manifestGeneratedAssets: awaitingReview.length,
    awaitingEducatorReview: awaitingReview.length,
  },
  byGroup,
  hqFiles: [...hqOnDisk].sort(),
  placeholderIds: placeholders.map((i) => i.id).sort(),
  withHqIds: withHq.map((i) => i.id).sort(),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");

const md = `# Ghana KG2 visual coverage report

Generated: ${report.generatedAt}

## Totals

| Metric | Count |
|--------|------:|
| KG2 catalog items | ${report.totals.kg2CatalogItems} |
| Items with suitable HQ visuals | ${report.totals.withSuitableHqVisuals} |
| Remaining placeholders | ${report.totals.remainingPlaceholders} |
| HQ WebP files on disk | ${report.totals.hqWebpFilesOnDisk} |
| Manifest assets awaiting educator review | ${report.totals.awaitingEducatorReview} |

Unique HQ WebP files are counted once in \`hqWebpFilesOnDisk\`. Catalog items that reuse a shared poster (e.g. mango fruit + mango rhyme) each count in \`withSuitableHqVisuals\` but do not inflate the unique asset total.

## By learning group

| Group | Total | With HQ | Placeholders |
|-------|------:|--------:|-------------:|
${Object.entries(byGroup)
  .sort((a, b) => b[1].total - a[1].total)
  .map(
    ([k, v]) =>
      `| ${k} | ${v.total} | ${v.withHq} | ${v.total - v.withHq} |`
  )
  .join("\n")}

## Notes

- HQ assets are original fal.ai generations (\`fal-ai/flux/schnell\`). **Not educator-reviewed.**
- Generated speech (espeak-ng / browser TTS) remains distinct from educator-reviewed native recordings.
- Story posters use storybook illustration style; object cards stay photographic.

## Educator review checklist

All fal-generated assets ship with \`licensing.reviewed: false\`. Before certification claims, review:

- [ ] Counting accuracy (exactly 3 oranges, 4 bananas, 5 mangoes)
- [ ] Ghana flag colours and black star accuracy
- [ ] Cultural accuracy for kente, talking drum, potter, market seller, weaver
- [ ] Child-safe body-part photos (hand, eye)
- [ ] Occupation depictions respectful and non-stereotyped
- [ ] Ananse storybook style consistent and age-appropriate
- [ ] No readable brand logos or accidental text inside images
- [ ] No mixing of photographic and storybook styles within one collection card

## Regeneration

\`\`\`bash
FAL_API_KEY=… node scripts/gigalearn-generate-kg2-hq.mjs   # skips existing unless FAL_FORCE=1
node scripts/gigalearn-kg2-hq-coverage.mjs
\`\`\`
`;

writeFileSync(OUT_MD, md);
console.log(JSON.stringify(report.totals, null, 2));
console.log("Wrote", OUT);
console.log("Wrote", OUT_MD);
