#!/usr/bin/env node
/**
 * Generates Ghana Phase 2 Discover catalogue shards + bright subject-specific SVGs.
 * Spoken TTS is never labeled as melodic music. Run: node scripts/gigalearn-phase2-generate.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const MEDIA = join(ROOT, "web/public/gigalearn/media/ghana/phase2");
const LIB = join(ROOT, "web/lib/gigalearn/mediaLibrary");
mkdirSync(MEDIA, { recursive: true });

const GH = {
  countryId: "ghana",
  countryCode: "GH",
  regionScope: "country",
  curriculumId: "gh-ccp",
};

const RIGHTS = {
  source: "Original Giga3 educational content for Ghana early years (Phase 2)",
  rights: "original",
  reviewed: false,
};

const SPEECH = {
  source:
    "English audio generated with espeak-ng en+m3 (warmer male spoken narration). Local-language labels use browser TTS female profiles (Abena/Naa) unchanged. Spoken TTS — not a melodic music recording; not educator-reviewed native speech.",
  rights: "original",
  reviewed: false,
};

function age(levels) {
  if (levels.includes("KG1") && !levels.includes("P2"))
    return { minAge: 4, maxAge: 5, label: "KG1–KG2 (ages 4–5)" };
  if (levels.includes("P1"))
    return { minAge: 5, maxAge: 8, label: "KG2–P2 (ages 5–8)" };
  return { minAge: 4, maxAge: 7, label: "Early primary (ages 4–7)" };
}

function curriculumLevel(levels) {
  if (levels.includes("KG1") && !levels.includes("KG2")) return "kg-1";
  if (levels.includes("KG2") && !levels.includes("P1")) return "kg-2";
  if (levels.includes("P1")) return "basic-1";
  return "kg-2";
}

function svgCard({ bg, title, shapes, caption }) {
  const label = (caption || title).replace(/[<>&"]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg[0]}"/>
      <stop offset="100%" stop-color="${bg[1]}"/>
    </linearGradient>
  </defs>
  <rect width="480" height="480" rx="36" fill="url(#sky)"/>
  <circle cx="400" cy="70" r="36" fill="#FFE082" opacity="0.95"/>
  ${shapes}
  <rect x="24" y="400" width="432" height="56" rx="16" fill="#FFFFFF" opacity="0.92"/>
  <text x="240" y="436" text-anchor="middle" font-family="Nunito,Segoe UI,sans-serif" font-size="22" font-weight="700" fill="#1a233f">${label}</text>
</svg>`;
}

/** Subject-specific bright shapes — each key must look distinct for KG learners. */
const SVG_SHAPES = {
  mango: `<ellipse cx="230" cy="230" rx="90" ry="110" fill="#FFB300"/><ellipse cx="200" cy="200" rx="28" ry="36" fill="#FFD54F" opacity="0.55"/><path d="M230 110 C220 150 250 160 270 170" stroke="#2E7D32" stroke-width="14" fill="none" stroke-linecap="round"/><ellipse cx="290" cy="150" rx="40" ry="18" fill="#66BB6A" transform="rotate(25 290 150)"/>`,
  banana: `<path d="M150 150 Q90 250 150 340 Q200 280 190 170 Z" fill="#FDD835"/><path d="M200 140 Q150 260 200 355 Q245 290 235 160 Z" fill="#FFEE58"/><path d="M250 145 Q210 270 255 360 Q300 295 285 165 Z" fill="#FDD835"/><ellipse cx="210" cy="130" rx="42" ry="16" fill="#6D4C41"/>`,
  bananas1: `<path d="M210 150 Q160 250 210 340 Q250 280 245 170 Z" fill="#FDD835"/><ellipse cx="220" cy="140" rx="24" ry="12" fill="#6D4C41"/>`,
  bananas3: `<path d="M140 160 Q100 250 150 330 Q190 270 185 170 Z" fill="#FDD835"/><path d="M200 145 Q155 255 205 345 Q245 285 235 165 Z" fill="#FFEE58"/><path d="M260 155 Q220 260 265 350 Q305 290 290 170 Z" fill="#FDD835"/><ellipse cx="210" cy="135" rx="40" ry="14" fill="#6D4C41"/>`,
  bananas5: `<g transform="translate(-30,0)"><path d="M150 160 Q110 250 155 330 Q190 270 185 170 Z" fill="#FDD835"/><path d="M195 145 Q155 255 200 345 Q235 285 230 165 Z" fill="#FFEE58"/><path d="M240 150 Q200 255 245 340 Q280 285 275 165 Z" fill="#FDD835"/><path d="M285 155 Q250 255 290 340 Q320 285 310 170 Z" fill="#FFEE58"/><path d="M325 165 Q295 255 330 335 Q355 285 348 180 Z" fill="#FDD835"/><ellipse cx="240" cy="140" rx="50" ry="14" fill="#6D4C41"/></g>`,
  orange: `<circle cx="240" cy="230" r="100" fill="#FB8C00"/><circle cx="210" cy="200" r="28" fill="#FFB74D" opacity="0.5"/><ellipse cx="250" cy="120" rx="18" ry="10" fill="#2E7D32"/><path d="M250 120 Q270 100 290 115" stroke="#66BB6A" stroke-width="10" fill="none"/>`,
  coconut: `<ellipse cx="240" cy="250" rx="95" ry="85" fill="#6D4C41"/><ellipse cx="240" cy="240" rx="70" ry="60" fill="#A1887F"/><circle cx="220" cy="230" r="8" fill="#3E2723"/><circle cx="250" cy="220" r="8" fill="#3E2723"/><circle cx="245" cy="250" r="8" fill="#3E2723"/><ellipse cx="300" cy="150" rx="50" ry="20" fill="#81C784" transform="rotate(-20 300 150)"/>`,
  drum: `<ellipse cx="240" cy="150" rx="100" ry="36" fill="#FFE0B2"/><path d="M140 150 L170 330 Q240 370 310 330 L340 150" fill="#8D6E63"/><ellipse cx="240" cy="330" rx="70" ry="24" fill="#5D4037"/><path d="M155 190 C200 230 280 230 325 190" stroke="#FFD54F" stroke-width="8" fill="none"/><line x1="360" y1="120" x2="400" y2="220" stroke="#5D4037" stroke-width="10" stroke-linecap="round"/><line x1="390" y1="110" x2="420" y2="200" stroke="#5D4037" stroke-width="10" stroke-linecap="round"/>`,
  child: `<circle cx="240" cy="150" r="44" fill="#8D5524"/><circle cx="225" cy="145" r="5" fill="#212121"/><circle cx="255" cy="145" r="5" fill="#212121"/><path d="M225 168 Q240 180 255 168" stroke="#5D4037" stroke-width="4" fill="none"/><path d="M185 210 Q240 190 295 210 L305 320 Q240 345 175 320 Z" fill="#42A5F5"/><rect x="210" y="320" width="22" height="48" rx="8" fill="#5D4037"/><rect x="248" y="320" width="22" height="48" rx="8" fill="#5D4037"/>`,
  childClap: `<circle cx="240" cy="150" r="44" fill="#8D5524"/><circle cx="225" cy="145" r="5" fill="#212121"/><circle cx="255" cy="145" r="5" fill="#212121"/><path d="M225 168 Q240 180 255 168" stroke="#5D4037" stroke-width="4" fill="none"/><path d="M185 210 Q240 190 295 210 L305 300 Q240 325 175 300 Z" fill="#AB47BC"/><ellipse cx="130" cy="230" rx="28" ry="18" fill="#8D5524" transform="rotate(-25 130 230)"/><ellipse cx="350" cy="230" rx="28" ry="18" fill="#8D5524" transform="rotate(25 350 230)"/><rect x="210" y="300" width="22" height="50" rx="8" fill="#5D4037"/><rect x="248" y="300" width="22" height="50" rx="8" fill="#5D4037"/>`,
  childWave: `<circle cx="240" cy="160" r="44" fill="#8D5524"/><circle cx="225" cy="155" r="5" fill="#212121"/><circle cx="255" cy="155" r="5" fill="#212121"/><path d="M225 178 Q240 190 255 178" stroke="#5D4037" stroke-width="4" fill="none"/><path d="M185 220 Q240 200 295 220 L305 330 Q240 350 175 330 Z" fill="#26A69A"/><path d="M295 230 Q360 160 390 140" stroke="#8D5524" stroke-width="18" fill="none" stroke-linecap="round"/><circle cx="395" cy="130" r="16" fill="#8D5524"/><rect x="210" y="330" width="22" height="45" rx="8" fill="#5D4037"/><rect x="248" y="330" width="22" height="45" rx="8" fill="#5D4037"/>`,
  kente: `<rect x="80" y="120" width="320" height="220" rx="12" fill="#1B5E20"/><rect x="80" y="120" width="320" height="44" fill="#F9A825"/><rect x="80" y="208" width="320" height="44" fill="#C62828"/><rect x="80" y="296" width="320" height="44" fill="#1565C0"/><rect x="140" y="120" width="28" height="220" fill="#FFFFFF" opacity="0.9"/><rect x="240" y="120" width="28" height="220" fill="#F9A825"/>`,
  kentePeek1: `<rect x="100" y="160" width="280" height="60" rx="8" fill="#C62828"/><rect x="100" y="220" width="280" height="60" rx="8" fill="#F9A825"/>`,
  kentePeek2: `<rect x="100" y="140" width="280" height="50" rx="8" fill="#C62828"/><rect x="100" y="190" width="280" height="50" rx="8" fill="#F9A825"/><rect x="100" y="240" width="280" height="50" rx="8" fill="#1B5E20"/>`,
  kentePeek3: `<rect x="80" y="120" width="320" height="220" rx="12" fill="#1B5E20"/><rect x="80" y="120" width="320" height="44" fill="#F9A825"/><rect x="80" y="208" width="320" height="44" fill="#C62828"/><rect x="80" y="296" width="320" height="44" fill="#1565C0"/><rect x="140" y="120" width="28" height="220" fill="#FFFFFF"/>`,
  goat: `<ellipse cx="250" cy="260" rx="110" ry="70" fill="#A1887F"/><circle cx="160" cy="210" r="42" fill="#8D6E63"/><circle cx="145" cy="200" r="6" fill="#212121"/><path d="M130 230 Q120 260 125 280" stroke="#6D4C41" stroke-width="8" fill="none"/><polygon points="135,175 125,140 155,175" fill="#8D6E63"/><polygon points="175,175 185,140 155,175" fill="#8D6E63"/><rect x="210" y="320" width="18" height="50" rx="6" fill="#5D4037"/><rect x="280" y="320" width="18" height="50" rx="6" fill="#5D4037"/>`,
  hen: `<ellipse cx="250" cy="260" rx="90" ry="60" fill="#FFCC80"/><circle cx="170" cy="220" r="36" fill="#FFE0B2"/><polygon points="140,220 110,210 140,235" fill="#EF6C00"/><circle cx="160" cy="212" r="5" fill="#212121"/><polygon points="165,185 175,155 190,185" fill="#E53935"/><ellipse cx="300" cy="250" rx="40" ry="20" fill="#FFAB91"/><rect x="220" y="310" width="14" height="40" fill="#F9A825"/><rect x="250" y="310" width="14" height="40" fill="#F9A825"/>`,
  fish: `<ellipse cx="240" cy="230" rx="110" ry="55" fill="#29B6F6"/><polygon points="340,230 400,180 400,280" fill="#0288D1"/><circle cx="180" cy="215" r="10" fill="#212121"/><path d="M200 250 Q240 270 280 250" stroke="#0277BD" stroke-width="4" fill="none"/>`,
  fishClean: `<ellipse cx="220" cy="240" rx="90" ry="45" fill="#4FC3F7"/><polygon points="300,240 350,200 350,280" fill="#0288D1"/><rect x="60" y="300" width="360" height="40" rx="10" fill="#81D4FA"/><circle cx="120" cy="280" r="12" fill="#A5D6A7"/><circle cx="180" cy="290" r="10" fill="#C8E6C9"/>`,
  fishDirty: `<ellipse cx="220" cy="240" rx="90" ry="45" fill="#78909C"/><polygon points="300,240 350,200 350,280" fill="#546E7A"/><rect x="60" y="300" width="360" height="40" rx="10" fill="#90A4AE"/><rect x="100" y="270" width="30" height="20" fill="#FF7043"/><rect x="200" y="280" width="24" height="18" fill="#FFA726"/>`,
  house: `<rect x="120" y="200" width="240" height="160" fill="#FFCC80"/><polygon points="100,200 240,100 380,200" fill="#E53935"/><rect x="210" y="260" width="60" height="100" fill="#5D4037"/><rect x="150" y="240" width="40" height="40" fill="#81D4FA"/><rect x="290" y="240" width="40" height="40" fill="#81D4FA"/>`,
  houseRed: `<rect x="120" y="200" width="240" height="160" fill="#FFCC80"/><polygon points="100,200 240,100 380,200" fill="#E53935"/><rect x="150" y="240" width="50" height="50" fill="#E53935"/><circle cx="320" cy="280" r="28" fill="#E53935"/><rect x="210" y="260" width="60" height="100" fill="#5D4037"/>`,
  bus: `<rect x="80" y="200" width="320" height="120" rx="20" fill="#F9A825"/><rect x="110" y="220" width="70" height="50" rx="8" fill="#81D4FA"/><rect x="200" y="220" width="70" height="50" rx="8" fill="#81D4FA"/><rect x="290" y="220" width="70" height="50" rx="8" fill="#81D4FA"/><circle cx="140" cy="330" r="28" fill="#212121"/><circle cx="340" cy="330" r="28" fill="#212121"/><circle cx="140" cy="330" r="12" fill="#BDBDBD"/><circle cx="340" cy="330" r="12" fill="#BDBDBD"/>`,
  rain: `<rect x="0" y="280" width="480" height="120" fill="#90CAF9" opacity="0.5"/><path d="M80 120 L100 200" stroke="#1565C0" stroke-width="6" stroke-linecap="round"/><path d="M160 90 L180 180" stroke="#1565C0" stroke-width="6" stroke-linecap="round"/><path d="M240 110 L260 200" stroke="#1565C0" stroke-width="6" stroke-linecap="round"/><path d="M320 85 L340 175" stroke="#1565C0" stroke-width="6" stroke-linecap="round"/><path d="M400 120 L420 200" stroke="#1565C0" stroke-width="6" stroke-linecap="round"/><rect x="160" y="240" width="160" height="90" fill="#FFCC80"/><polygon points="150,240 240,180 330,240" fill="#8D6E63"/>`,
  sun: `<circle cx="240" cy="220" r="70" fill="#FFD54F"/><g stroke="#FFB300" stroke-width="10" stroke-linecap="round"><line x1="240" y1="100" x2="240" y2="70"/><line x1="240" y1="370" x2="240" y2="340"/><line x1="100" y1="220" x2="70" y2="220"/><line x1="410" y1="220" x2="380" y2="220"/><line x1="140" y1="120" x2="120" y2="100"/><line x1="340" y1="120" x2="360" y2="100"/><line x1="140" y1="320" x2="120" y2="340"/><line x1="340" y1="320" x2="360" y2="340"/></g>`,
  hands: `<ellipse cx="160" cy="240" rx="55" ry="70" fill="#8D5524"/><ellipse cx="320" cy="240" rx="55" ry="70" fill="#8D5524"/><circle cx="130" cy="190" r="16" fill="#8D5524"/><circle cx="160" cy="175" r="16" fill="#8D5524"/><circle cx="190" cy="190" r="16" fill="#8D5524"/><circle cx="290" cy="190" r="16" fill="#8D5524"/><circle cx="320" cy="175" r="16" fill="#8D5524"/><circle cx="350" cy="190" r="16" fill="#8D5524"/>`,
  water: `<ellipse cx="240" cy="280" rx="120" ry="50" fill="#4FC3F7"/><path d="M160 200 Q200 140 240 200 Q280 140 320 200" fill="#81D4FA"/><rect x="200" y="120" width="80" height="100" rx="12" fill="#29B6F6" opacity="0.7"/>`,
  cricket: `<ellipse cx="240" cy="250" rx="80" ry="40" fill="#7CB342"/><circle cx="170" cy="230" r="28" fill="#8BC34A"/><circle cx="160" cy="220" r="5" fill="#212121"/><path d="M300 240 Q360 180 390 160" stroke="#558B2F" stroke-width="8" fill="none"/><path d="M300 260 Q360 300 390 320" stroke="#558B2F" stroke-width="8" fill="none"/><circle cx="80" cy="100" r="20" fill="#FFF59D"/><circle cx="120" cy="140" r="12" fill="#FFF59D"/>`,
  bag: `<rect x="150" y="160" width="180" height="160" rx="16" fill="#5C6BC0"/><rect x="170" y="200" width="140" height="20" fill="#3949AB"/><path d="M180 160 Q240 100 300 160" stroke="#283593" stroke-width="14" fill="none"/><circle cx="240" cy="240" r="18" fill="#FFD54F"/>`,
  ribbon: `<rect x="100" y="220" width="280" height="36" rx="8" fill="#E53935"/><rect x="100" y="256" width="280" height="28" rx="8" fill="#F9A825"/><rect x="100" y="284" width="280" height="28" rx="8" fill="#43A047"/><circle cx="240" cy="180" r="40" fill="#E53935"/><path d="M220 180 L180 120 L240 150 L300 120 L260 180" fill="#F9A825"/>`,
  clouds: `<ellipse cx="160" cy="200" rx="70" ry="40" fill="#FFFFFF"/><ellipse cx="210" cy="180" rx="50" ry="35" fill="#FFFFFF"/><ellipse cx="300" cy="220" rx="80" ry="45" fill="#F5F5F5"/><ellipse cx="350" cy="200" rx="45" ry="30" fill="#FFFFFF"/><rect x="0" y="300" width="480" height="100" fill="#81C784"/>`,
  heart: `<path d="M240 320 C160 260 120 200 160 150 C190 120 230 140 240 180 C250 140 290 120 320 150 C360 200 320 260 240 320 Z" fill="#E53935"/>`,
  garden: `<rect x="0" y="300" width="480" height="100" fill="#8D6E63"/><rect x="80" y="220" width="18" height="90" fill="#2E7D32"/><ellipse cx="89" cy="210" rx="30" ry="20" fill="#66BB6A"/><rect x="180" y="200" width="18" height="110" fill="#2E7D32"/><ellipse cx="189" cy="190" rx="32" ry="22" fill="#81C784"/><rect x="280" y="230" width="18" height="80" fill="#2E7D32"/><ellipse cx="289" cy="220" rx="28" ry="18" fill="#43A047"/><rect x="360" y="210" width="18" height="100" fill="#2E7D32"/><ellipse cx="369" cy="200" rx="30" ry="20" fill="#66BB6A"/>`,
  friends: `<circle cx="180" cy="170" r="36" fill="#8D5524"/><circle cx="300" cy="170" r="36" fill="#A1887F"/><path d="M140 230 Q180 210 220 230 L225 330 Q180 350 135 330 Z" fill="#42A5F5"/><path d="M260 230 Q300 210 340 230 L345 330 Q300 350 255 330 Z" fill="#EC407A"/><path d="M220 250 Q240 270 260 250" stroke="#F9A825" stroke-width="8" fill="none"/>`,
  soup: `<ellipse cx="240" cy="280" rx="120" ry="50" fill="#6D4C41"/><ellipse cx="240" cy="250" rx="110" ry="45" fill="#EF6C00"/><ellipse cx="210" cy="240" rx="20" ry="10" fill="#FFCC80"/><ellipse cx="270" cy="245" rx="16" ry="8" fill="#8BC34A"/><rect x="330" y="160" width="16" height="120" rx="6" fill="#5D4037" transform="rotate(25 330 160)"/>`,
  ear: `<ellipse cx="240" cy="230" rx="70" ry="100" fill="#8D5524"/><ellipse cx="250" cy="230" rx="40" ry="60" fill="#A1887F"/><ellipse cx="255" cy="230" rx="18" ry="30" fill="#6D4C41"/>`,
  stars: `<polygon points="120,200 132,240 175,240 140,265 152,310 120,285 88,310 100,265 65,240 108,240" fill="#FFD54F"/><polygon points="280,160 292,200 335,200 300,225 312,270 280,245 248,270 260,225 225,200 268,200" fill="#FFF176"/><polygon points="360,260 372,300 415,300 380,325 392,370 360,345 328,370 340,325 305,300 348,300" fill="#FFD54F"/>`,
  book: `<rect x="130" y="140" width="220" height="200" rx="12" fill="#FFECB3"/><rect x="130" y="140" width="40" height="200" fill="#FFA000"/><text x="260" y="250" text-anchor="middle" font-size="48" fill="#E65100">ABC</text>`,
  toothbrush: `<rect x="220" y="120" width="40" height="200" rx="12" fill="#90CAF9"/><rect x="210" y="100" width="60" height="40" rx="8" fill="#FFFFFF"/><rect x="215" y="105" width="10" height="30" fill="#E3F2FD"/><rect x="230" y="105" width="10" height="30" fill="#E3F2FD"/><rect x="245" y="105" width="10" height="30" fill="#E3F2FD"/><circle cx="240" cy="360" r="30" fill="#FFF59D"/>`,
  red: `<rect x="100" y="140" width="280" height="200" rx="24" fill="#E53935"/><circle cx="240" cy="240" r="50" fill="#FFCDD2"/>`,
  blue: `<rect x="100" y="140" width="280" height="200" rx="24" fill="#1E88E5"/><circle cx="240" cy="240" r="50" fill="#BBDEFB"/>`,
  circle: `<circle cx="240" cy="230" r="110" fill="#FFFFFF" stroke="#7E57C2" stroke-width="16"/><circle cx="240" cy="230" r="40" fill="#7E57C2"/>`,
  square: `<rect x="130" y="130" width="220" height="220" rx="8" fill="#FFFFFF" stroke="#00897B" stroke-width="16"/><rect x="190" y="190" width="100" height="100" fill="#00897B"/>`,
  hand: `<ellipse cx="240" cy="260" rx="70" ry="90" fill="#8D5524"/><rect x="170" y="140" width="28" height="90" rx="12" fill="#8D5524"/><rect x="210" y="120" width="28" height="100" rx="12" fill="#8D5524"/><rect x="250" y="120" width="28" height="100" rx="12" fill="#8D5524"/><rect x="290" y="140" width="28" height="90" rx="12" fill="#8D5524"/><rect x="150" y="220" width="40" height="70" rx="16" fill="#8D5524" transform="rotate(-25 150 220)"/>`,
  eye: `<ellipse cx="240" cy="230" rx="120" ry="70" fill="#FFFFFF" stroke="#5D4037" stroke-width="10"/><circle cx="240" cy="230" r="40" fill="#5D4037"/><circle cx="255" cy="215" r="12" fill="#FFFFFF"/>`,
  cup: `<path d="M160 160 L180 320 Q240 360 300 320 L320 160 Z" fill="#90CAF9"/><ellipse cx="240" cy="160" rx="80" ry="24" fill="#BBDEFB"/><path d="M320 200 Q380 220 370 280 Q360 320 320 300" stroke="#64B5F6" stroke-width="16" fill="none"/>`,
  chair: `<rect x="140" y="160" width="200" height="30" rx="6" fill="#8D6E63"/><rect x="150" y="190" width="30" height="140" fill="#6D4C41"/><rect x="300" y="190" width="30" height="140" fill="#6D4C41"/><rect x="150" y="250" width="180" height="24" fill="#A1887F"/><rect x="160" y="120" width="24" height="50" fill="#6D4C41"/><rect x="300" y="120" width="24" height="50" fill="#6D4C41"/>`,
  teacher: `<circle cx="240" cy="140" r="40" fill="#8D5524"/><path d="M180 200 Q240 180 300 200 L310 320 Q240 350 170 320 Z" fill="#5E35B1"/><rect x="300" y="220" width="80" height="12" fill="#FFECB3"/><rect x="360" y="160" width="12" height="80" fill="#8D6E63"/>`,
  farmer: `<circle cx="240" cy="150" r="40" fill="#8D5524"/><ellipse cx="240" cy="120" rx="55" ry="18" fill="#F9A825"/><path d="M180 210 Q240 190 300 210 L310 330 Q240 355 170 330 Z" fill="#43A047"/><rect x="100" y="280" width="80" height="16" fill="#8D6E63"/><rect x="100" y="250" width="16" height="80" fill="#6D4C41"/>`,
  potter: `<circle cx="200" cy="160" r="36" fill="#8D5524"/><path d="M150 210 Q200 190 250 210 L255 300 Q200 320 145 300 Z" fill="#FF8A65"/><ellipse cx="320" cy="280" rx="55" ry="30" fill="#A1887F"/><ellipse cx="320" cy="250" rx="40" ry="35" fill="#BCAAA4"/><ellipse cx="320" cy="220" rx="28" ry="16" fill="#8D6E63"/>`,
  tree: `<rect x="220" y="260" width="40" height="100" fill="#6D4C41"/><circle cx="240" cy="200" r="90" fill="#43A047"/><circle cx="190" cy="180" r="50" fill="#66BB6A"/><circle cx="290" cy="190" r="55" fill="#2E7D32"/><circle cx="210" cy="230" r="16" fill="#E53935"/><circle cx="270" cy="220" r="14" fill="#FFB300"/>`,
  river: `<path d="M0 200 Q120 160 240 200 Q360 240 480 180 L480 360 L0 360 Z" fill="#29B6F6"/><path d="M0 240 Q140 210 260 250 Q380 290 480 230" stroke="#81D4FA" stroke-width="10" fill="none"/><circle cx="100" cy="140" r="30" fill="#66BB6A"/><rect x="90" y="160" width="20" height="40" fill="#8D6E63"/>`,
  soap: `<rect x="160" y="200" width="160" height="90" rx="20" fill="#F8BBD0"/><ellipse cx="240" cy="180" rx="40" ry="20" fill="#E1F5FE" opacity="0.8"/><circle cx="300" cy="160" r="18" fill="#E1F5FE" opacity="0.7"/><rect x="100" y="300" width="280" height="40" rx="12" fill="#4FC3F7"/>`,
  soapRinse: `<rect x="160" y="180" width="160" height="90" rx="20" fill="#F8BBD0"/><path d="M200 140 L210 200" stroke="#4FC3F7" stroke-width="8" stroke-linecap="round"/><path d="M240 120 L250 190" stroke="#4FC3F7" stroke-width="8" stroke-linecap="round"/><path d="M280 140 L290 200" stroke="#4FC3F7" stroke-width="8" stroke-linecap="round"/><ellipse cx="240" cy="300" rx="100" ry="30" fill="#81D4FA"/>`,
  market: `<rect x="60" y="200" width="100" height="120" fill="#FFCC80"/><polygon points="50,200 110,150 170,200" fill="#E53935"/><rect x="190" y="210" width="100" height="110" fill="#FFE082"/><polygon points="180,210 240,160 300,210" fill="#43A047"/><rect x="320" y="200" width="100" height="120" fill="#FFAB91"/><polygon points="310,200 370,150 430,200" fill="#1E88E5"/><circle cx="110" cy="280" r="16" fill="#FB8C00"/><circle cx="240" cy="290" r="18" fill="#FDD835"/><ellipse cx="370" cy="285" rx="22" ry="14" fill="#8D6E63"/>`,
  letterA: `<text x="240" y="220" text-anchor="middle" font-family="Nunito,sans-serif" font-size="160" font-weight="800" fill="#FFFFFF">A</text><circle cx="120" cy="320" r="40" fill="#E53935"/><ellipse cx="360" cy="320" rx="44" ry="34" fill="#FFB300"/><rect x="100" y="300" width="40" height="10" fill="#2E7D32"/>`,
  letterA2: `<circle cx="160" cy="220" r="55" fill="#E53935"/><ellipse cx="160" cy="190" rx="12" ry="8" fill="#2E7D32"/><ellipse cx="320" cy="240" rx="70" ry="35" fill="#5D4037"/><circle cx="280" cy="220" r="10" fill="#212121"/><text x="240" y="360" text-anchor="middle" font-size="32" fill="#FFFFFF" font-weight="700">apple · ant</text>`,
  letterA3: `<rect x="80" y="140" width="140" height="160" rx="16" fill="#5E35B1"/><text x="150" y="250" text-anchor="middle" font-family="Nunito,sans-serif" font-size="120" font-weight="800" fill="#FFFFFF">A</text><rect x="260" y="160" width="140" height="140" rx="70" fill="#EC407A"/><text x="330" y="255" text-anchor="middle" font-family="Nunito,sans-serif" font-size="100" font-weight="800" fill="#FFCDD2">a</text>`,
  letterB: `<text x="240" y="270" text-anchor="middle" font-family="Nunito,sans-serif" font-size="180" font-weight="800" fill="#FFFFFF">B</text>`,
  number3: `<text x="240" y="260" text-anchor="middle" font-family="Nunito,sans-serif" font-size="180" font-weight="800" fill="#FFFFFF">3</text><circle cx="120" cy="340" r="18" fill="#8D6E63"/><circle cx="240" cy="340" r="18" fill="#8D6E63"/><circle cx="360" cy="340" r="18" fill="#8D6E63"/>`,
  number5: `<text x="240" y="250" text-anchor="middle" font-family="Nunito,sans-serif" font-size="160" font-weight="800" fill="#FFFFFF">5</text><g fill="#FFB300"><circle cx="100" cy="340" r="16"/><circle cx="160" cy="340" r="16"/><circle cx="220" cy="340" r="16"/><circle cx="280" cy="340" r="16"/><circle cx="340" cy="340" r="16"/></g>`,
  ananse: `<ellipse cx="240" cy="240" rx="70" ry="55" fill="#5D4037"/><circle cx="240" cy="170" r="36" fill="#6D4C41"/><circle cx="228" cy="165" r="5" fill="#FFD54F"/><circle cx="252" cy="165" r="5" fill="#FFD54F"/><path d="M180 220 Q120 180 90 140" stroke="#5D4037" stroke-width="8" fill="none"/><path d="M300 220 Q360 180 390 140" stroke="#5D4037" stroke-width="8" fill="none"/><path d="M180 260 Q120 300 90 340" stroke="#5D4037" stroke-width="8" fill="none"/><path d="M300 260 Q360 300 390 340" stroke="#5D4037" stroke-width="8" fill="none"/><ellipse cx="340" cy="300" rx="40" ry="30" fill="#FFCC80"/>`,
  pencil: `<rect x="220" y="100" width="40" height="240" rx="6" fill="#FDD835"/><polygon points="220,340 240,390 260,340" fill="#FFCC80"/><polygon points="230,370 240,390 250,370" fill="#5D4037"/><rect x="220" y="100" width="40" height="30" fill="#E53935"/>`,
  umbrella: `<path d="M100 220 Q240 80 380 220 Z" fill="#E53935"/><rect x="230" y="220" width="14" height="140" fill="#5D4037"/><circle cx="180" cy="300" r="28" fill="#8D5524"/><circle cx="300" cy="310" r="28" fill="#A1887F"/>`,
  pot: `<ellipse cx="240" cy="300" rx="100" ry="40" fill="#8D6E63"/><path d="M160 200 Q160 300 240 320 Q320 300 320 200" fill="#A1887F"/><ellipse cx="240" cy="200" rx="80" ry="28" fill="#BCAAA4"/>`,
  borehole: `<rect x="180" y="160" width="120" height="160" rx="12" fill="#90A4AE"/><circle cx="240" cy="220" r="40" fill="#29B6F6"/><rect x="100" y="300" width="60" height="50" fill="#FFE082"/><rect x="320" y="300" width="60" height="50" fill="#FFE082"/><circle cx="130" cy="280" r="22" fill="#8D5524"/><circle cx="350" cy="280" r="22" fill="#A1887F"/>`,
  library: `<rect x="80" y="140" width="320" height="220" fill="#FFE0B2"/><rect x="100" y="160" width="40" height="160" fill="#EF5350"/><rect x="150" y="160" width="40" height="160" fill="#42A5F5"/><rect x="200" y="160" width="40" height="160" fill="#66BB6A"/><rect x="250" y="160" width="40" height="160" fill="#FFA726"/><rect x="300" y="160" width="40" height="160" fill="#AB47BC"/><circle cx="240" cy="100" r="24" fill="#FFF59D"/>`,
  blacksmith: `<rect x="100" y="260" width="200" height="80" fill="#616161"/><circle cx="320" cy="220" r="40" fill="#FF7043"/><circle cx="330" cy="200" r="12" fill="#FFD54F"/><rect x="280" y="240" width="100" height="20" fill="#455A64"/><circle cx="160" cy="200" r="32" fill="#8D5524"/>`,
  farm: `<rect x="0" y="280" width="480" height="120" fill="#8D6E63"/><rect x="40" y="300" width="40" height="60" fill="#F9A825" opacity="0.8"/><rect x="100" y="290" width="40" height="70" fill="#FDD835"/><rect x="160" y="305" width="40" height="55" fill="#F9A825"/><circle cx="300" cy="180" r="36" fill="#8D5524"/><path d="M260 230 Q300 210 340 230 L345 320 Q300 340 255 320 Z" fill="#43A047"/>`,
  moon: `<circle cx="300" cy="160" r="60" fill="#FFF59D"/><circle cx="320" cy="145" r="50" fill="#1A237E"/><rect x="60" y="280" width="360" height="80" fill="#5D4037"/><circle cx="140" cy="250" r="24" fill="#8D5524"/><circle cx="220" cy="250" r="24" fill="#A1887F"/><circle cx="300" cy="250" r="24" fill="#8D5524"/>`,
  sankofa: `<circle cx="240" cy="230" r="90" fill="#6A1B9A"/><path d="M200 200 Q240 140 290 200 Q310 240 270 280 Q240 300 210 270 Q180 240 200 200" fill="none" stroke="#FFD54F" stroke-width="14"/><circle cx="270" cy="180" r="16" fill="#FFD54F"/>`,
  bodyWave1: `<circle cx="240" cy="140" r="40" fill="#8D5524"/><path d="M185 200 Q240 180 295 200 L300 320 Q240 340 180 320 Z" fill="#29B6F6"/><ellipse cx="130" cy="230" rx="30" ry="16" fill="#8D5524"/><ellipse cx="350" cy="230" rx="30" ry="16" fill="#8D5524"/>`,
  bodyWave2: `<circle cx="240" cy="140" r="40" fill="#8D5524"/><path d="M185 200 Q240 180 295 200 L300 300 Q240 320 180 300 Z" fill="#29B6F6"/><rect x="210" y="300" width="24" height="60" rx="8" fill="#8D5524"/><rect x="246" y="300" width="24" height="60" rx="8" fill="#8D5524"/>`,
  bodyWave3: `<circle cx="240" cy="140" r="40" fill="#8D5524"/><path d="M185 200 Q240 180 295 200 L305 330 Q240 355 175 330 Z" fill="#26A69A"/><text x="240" y="250" text-anchor="middle" font-size="28" fill="#FFFFFF" font-weight="700">hands · feet</text>`,
  circlePlate: `<ellipse cx="240" cy="250" rx="120" ry="40" fill="#ECEFF1"/><ellipse cx="240" cy="240" rx="100" ry="30" fill="#FFFFFF" stroke="#BDBDBD" stroke-width="4"/><circle cx="240" cy="140" r="50" fill="#FFF59D"/>`,
  circleMoon: `<circle cx="240" cy="220" r="100" fill="#FFF59D"/><circle cx="270" cy="190" r="20" fill="#FFF9C4" opacity="0.5"/>`,
  circleDrum: `<ellipse cx="240" cy="180" rx="90" ry="30" fill="#FFE0B2"/><path d="M150 180 L175 320 Q240 350 305 320 L330 180" fill="#8D6E63"/>`,
};

function writeSvg(name, kind, caption, bg) {
  const shapes = SVG_SHAPES[kind] || SVG_SHAPES.mango;
  const path = join(MEDIA, `${name}.svg`);
  writeFileSync(path, svgCard({ bg, title: caption, shapes, caption }));
  return { path: `/gigalearn/media/ghana/phase2/${name}.svg`, bytes: statSync(path).size };
}

function speakEn(text, fileBase) {
  const wav = `${fileBase}.wav`;
  const mp3 = `${fileBase}.mp3`;
  execFileSync("espeak-ng", ["-v", "en+m3", "-s", "125", "-p", "45", "-w", wav, text], {
    stdio: "ignore",
  });
  execFileSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-qscale:a", "6", mp3],
    { stdio: "ignore" }
  );
  try {
    unlinkSync(wav);
  } catch {
    /* ignore */
  }
  return {
    path: `/gigalearn/media/ghana/phase2/${fileBase.split("/").pop()}.mp3`,
    bytes: statSync(mp3).size,
  };
}

function offlineBytes(remoteMedia) {
  return remoteMedia.reduce((sum, asset) => sum + (asset.estimatedBytes || 0), 0);
}

function item(partial) {
  const levels = partial.levels;
  const remoteMedia = partial.remoteMedia || [];
  return {
    ...GH,
    curriculumLevelId: curriculumLevel(levels),
    curriculumNote: partial.curriculumNote || "Ghana Early Years / lower primary oral language",
    ageSuitability: age(levels),
    estimatedOfflineBytes: offlineBytes(remoteMedia) || partial.estimatedOfflineBytes || 4000,
    offlineEligible: true,
    rights: partial.rights || RIGHTS,
    ...partial,
    remoteMedia,
  };
}

const RHYME_DATA = [
  ["Sunrise Clap", "Sun up high, clap clap clap.\nFeet go tip, tip tip tap!\nWake up smiles for a brand new day.", "sun", "☀️"],
  ["Market Morning", "To the market we all go,\nTomatoes red and onions in a row.\nCount the colours as we shop.", "market", "🍅"],
  ["Rain on Roof", "Pitter patter on the roof,\nLittle drops that tell the truth.\nRain helps farms and flowers grow.", "rain", "🌧️"],
  ["Kind Hands", "Kind hands help, kind hands share.\nKind hands show that we care.\nGentle hands make friendship fair.", "hands", "🤝"],
  ["Five Little Goats", "Five little goats on a dusty hill,\nOne jumps down and four stand still.\nCount the goats — we can, we will!", "goat", "🐐"],
  ["Accra Bus", "Yellow bus, yellow bus,\nTake us safely home to us.\nWave to friends along the way.", "bus", "🚌"],
  ["Plantain Poem", "Soft plantain, golden brown,\nSweetest snack in our town.\nShare a piece, then sit right down.", "banana", "🍌"],
  ["Clean Teeth", "Brush up, brush down, smile so bright,\nClean white teeth from morning light.\nBrush again before goodnight.", "toothbrush", "😁"],
  ["Sharing Water", "One cup of water, cool and clear —\nWe share with friends who are near.\nSip and smile, then say thank you.", "water", "💧"],
  ["Night Cricket", "Cricket sings when lights go low,\nSoft goodnight so dreams can grow.\nStars keep watch until we know.", "cricket", "🌙"],
  ["School Bag", "Zip the bag, pack the book,\nWalk to school with a happy look.\nLearn and play — that is our hook!", "bag", "🎒"],
  ["Red Kente Ribbon", "Red ribbon, gold and green —\nBrightest colours ever seen.\nKente patterns, proud and keen.", "ribbon", "🎀"],
  ["Counting Clouds", "One white cloud, two float by,\nThree soft clouds in a Ghana sky.\nFour, then five — wave goodbye!", "clouds", "☁️"],
  ["Honest Heart", "Tell the truth, be brave and kind —\nHonesty grows a stronger mind.\nA truthful heart is gold to find.", "heart", "💛"],
  ["Little Drum Beat", "Beat the drum, soft then strong,\nFeel the rhythm all day long.\nHands keep time to our drum song.", "drum", "🥁"],
  ["Garden Beans", "Plant the beans, water slow,\nWatch the tiny green leaves grow.\nSun and rain help gardens show.", "garden", "🌱"],
  ["Friend Beside Me", "Hand in hand we walk the lane,\nFriendship makes the sunny rain.\nShare a smile again, again.", "friends", "👫"],
  ["Mama's Soup", "Stir the soup, smell the spice,\nDinner time feels warm and nice.\nThank you, Mama — that is right.", "soup", "🍲"],
  ["Quiet Listening", "Ears are open, mouths are still —\nListening well is a special skill.\nQuiet hearts can learn at will.", "ear", "👂"],
  ["Stars Over Accra", "Stars above Accra shine,\nCounting sparkles, one to nine.\nSleep well under skies so fine.", "stars", "⭐"],
];

const rhymes = [];
for (let i = 0; i < RHYME_DATA.length; i++) {
  const [title, poem, shape, emoji] = RHYME_DATA[i];
  const id = `rhyme-p2-${i + 1}`;
  const spoken = poem.replace(/\n/g, " ");
  const svg = writeSvg(id, shape, title, ["#81D4FA", "#FFF59D"]);
  const audio = speakEn(spoken, join(MEDIA, `${id}-en`));
  const remoteMedia = [
    { kind: "remote", url: svg.path, mimeType: "image/svg+xml", estimatedBytes: svg.bytes, required: true },
    {
      kind: "remote",
      url: `/gigalearn/media/ghana/phase2/${id}-en.mp3`,
      mimeType: "audio/mpeg",
      estimatedBytes: audio.bytes,
      required: true,
    },
  ];
  rhymes.push(
    item({
      id,
      title,
      description: `An original nursery rhyme for KG1–P2. Spoken lyric narration (not melodic music).\n\n${poem}`,
      contentType: "rhyme_song",
      discoverCategory: "rhymes-poems",
      levels: i < 10 ? ["KG1", "KG2", "P1"] : ["KG2", "P1", "P2"],
      subject: "Language",
      topic: "Nursery rhymes",
      languages: ["en", "tw"],
      illustration: { kind: "emoji", emoji, alt: `${title} illustration` },
      narrations: [
        { kind: "tts", text: spoken, voiceId: "english", language: "en" },
        { kind: "tts", text: spoken, voiceId: "abena-twi", language: "tw" },
      ],
      remoteMedia,
      rights: SPEECH,
    })
  );
}

/** Spoken lyric chants — NOT melodic song recordings. */
const SONG_DATA = [
  ["Clap and Count", "Clap one, clap two, clap three with me — counting is fun, you will see!", "childClap"],
  ["Hello Friend", "Hello friend, how do you do? I am glad to learn with you.", "friends"],
  ["Wash Your Hands", "Wash your hands, wash your hands, soap and water, clean again.", "soap"],
  ["Colours Everywhere", "Red and yellow, green and blue — colours shine for me and you.", "ribbon"],
  ["Walk to School", "Left and right, step by step, walking to school with pep.", "bag"],
  ["Thank You Chant", "Thank you Mama, thank you teacher — gratitude makes kindness richer.", "heart"],
  ["River Fish", "Little fish in the river bright, swim along from morning light.", "fish"],
  ["Farmers Dig", "Dig dig dig, plant plant plant — farmers feed our land.", "farm"],
  ["Good Morning Ghana", "Good morning Ghana, skies so blue, we learn and play the whole day through.", "sun"],
  ["Share the Ball", "Pass the ball, do not grab — sharing makes a happy class.", "childWave"],
  ["Alphabet Bounce", "A B C, bounce with me — letters dance so playfully.", "letterA"],
  ["Quiet Time", "Soft as cotton, calm and slow — quiet time helps good minds grow.", "moon"],
  ["Market Call", "Come buy oranges, come buy yam — market calls are Ghana's jam.", "market"],
  ["Brave Little Ant", "Ant so small but works so hard — courage lives in every yard.", "garden"],
  ["Evening Thanks", "Day is done, stars appear — thank you for the friends so dear.", "stars"],
];

const songs = [];
for (let i = 0; i < SONG_DATA.length; i++) {
  const [title, line, shape] = SONG_DATA[i];
  const id = `song-p2-${i + 1}`;
  const svg = writeSvg(id, shape, title, ["#F48FB1", "#FFE082"]);
  const audio = speakEn(line, join(MEDIA, `${id}-en`));
  const remoteMedia = [
    { kind: "remote", url: svg.path, mimeType: "image/svg+xml", estimatedBytes: svg.bytes, required: true },
    {
      kind: "remote",
      url: `/gigalearn/media/ghana/phase2/${id}-en.mp3`,
      mimeType: "audio/mpeg",
      estimatedBytes: audio.bytes,
      required: true,
    },
  ];
  songs.push(
    item({
      id,
      title,
      description: `Spoken lyric chant for early years (TTS word rhythm to clap or say along — not a melodic music recording): ${line}`,
      contentType: "rhyme_song",
      discoverCategory: "songs",
      levels: ["KG1", "KG2", "P1", "P2"],
      subject: "Creative Arts",
      topic: "Spoken lyric chants",
      languages: ["en"],
      illustration: { kind: "emoji", emoji: "👏", alt: `${title} chant illustration` },
      narrations: [{ kind: "tts", text: line, voiceId: "english", language: "en" }],
      remoteMedia,
      game: {
        id: `${id}-q`,
        prompt: "What should we do with a spoken chant?",
        options: ["Listen and say the words together", "Shout over friends", "Hide the words"],
        answer: "Listen and say the words together",
        feedbackCorrect: "Yes — listen and say the words kindly.",
        feedbackWrong: "Try again — chants work best when we listen.",
      },
      rights: SPEECH,
    })
  );
}

const STORY_DATA = [
  ["Ananse and the Sharing Pot", "Ananse found a pot of porridge. He learned that sharing made the meal sweeter.", "storytelling", "ananse", "pot", "🕷️"],
  ["Ama and the Lost Pencil", "Ama told the truth about a lost pencil and found a friend.", "honesty", "pencil", "heart", "✏️"],
  ["Kofi Helps Grandma", "Kofi carried water for Grandma and felt proud and kind.", "kindness", "water", "child", "💧"],
  ["The Market Goat", "A curious goat wandered the market until children guided it home.", "everyday", "goat", "market", "🐐"],
  ["Fati's First Day", "Fati was shy on her first school day, then made a new friend.", "friendship", "bag", "friends", "🏫"],
  ["The Talking Drum Message", "The drum called the village to celebrate a harvest.", "drumming", "drum", "farm", "🥁"],
  ["Yaw and the Mango Tree", "Yaw waited for mangoes to ripen instead of taking them early.", "honesty", "mango", "tree", "🥭"],
  ["Efua's Rainy Walk", "Efua shared her umbrella on a rainy Accra walk.", "kindness", "umbrella", "rain", "☔"],
  ["The Honest Fish Seller", "A seller returned extra coins and earned trust.", "honesty", "fish", "market", "🐟"],
  ["Little Weaver", "A child watched kente threads and learned patience.", "kente weaving", "kente", "child", "🧵"],
  ["The Kind Class Captain", "The captain helped classmates line up fairly.", "friendship", "childClap", "bag", "⭐"],
  ["Night Market Lights", "Twinkling lamps taught a child to stay close to family.", "everyday", "market", "moon", "🏮"],
  ["Sankofa Bird", "A story about looking back to learn and move forward.", "storytelling", "sankofa", "tree", "🐦"],
  ["The Pot Maker's Child", "Clay hands shaped a bowl for the family.", "pottery", "potter", "pot", "🏺"],
  ["Friends at the Borehole", "Children took turns filling buckets without pushing.", "friendship", "borehole", "water", "🚰"],
  ["The Quiet Library", "Soft voices helped everyone enjoy story time.", "everyday", "library", "book", "📚"],
  ["Blacksmith Sparks", "Safe watching taught respect for hot metal work.", "blacksmithing", "blacksmith", "childWave", "🔨"],
  ["Farm Morning", "A family planted maize and sang while working.", "farming and fishing", "farm", "sun", "🌾"],
  ["The Helpful Sibling", "An older sibling taught counting with stones.", "kindness", "number5", "childClap", "🧮"],
  ["Moon Over the Compound", "Neighbours shared stories under a bright moon.", "storytelling", "moon", "stars", "🌕"],
];

const stories = [];
for (let i = 0; i < STORY_DATA.length; i++) {
  const [title, text, theme, shapeA, shapeB, emoji] = STORY_DATA[i];
  const id = `story-p2-${i + 1}`;
  const svg1 = writeSvg(`${id}-a`, shapeA, title, ["#80CBC4", "#FFF59D"]);
  const svg2 = writeSvg(`${id}-b`, SVG_SHAPES[shapeB] ? shapeB : "house", "What happens next", ["#90CAF9", "#FFCC80"]);
  const audio = speakEn(text, join(MEDIA, `${id}-en`));
  const remoteMedia = [
    { kind: "remote", url: svg1.path, mimeType: "image/svg+xml", estimatedBytes: svg1.bytes, required: true },
    { kind: "remote", url: svg2.path, mimeType: "image/svg+xml", estimatedBytes: svg2.bytes, required: true },
    {
      kind: "remote",
      url: `/gigalearn/media/ghana/phase2/${id}-en.mp3`,
      mimeType: "audio/mpeg",
      estimatedBytes: audio.bytes,
      required: true,
    },
  ];
  stories.push(
    item({
      id,
      title,
      description: text,
      contentType: "video_story",
      discoverCategory: "african-stories",
      levels: i < 10 ? ["KG2", "P1"] : ["P1", "P2"],
      subject: "Language",
      topic: "Stories",
      languages: ["en"],
      culturalTheme: theme,
      illustration: { kind: "emoji", emoji, alt: `${title} story art` },
      narrations: [{ kind: "tts", text, voiceId: "english", language: "en" }],
      remoteMedia,
      game: {
        id: `${id}-q`,
        prompt: "What does this story teach?",
        options: ["Kindness and good choices", "Being unkind", "Ignoring friends"],
        answer: "Kindness and good choices",
        feedbackCorrect: "Yes — stories help us practise kindness.",
        feedbackWrong: "Listen again for the kind choice.",
      },
      rights: SPEECH,
    })
  );
}

/** Each video: three visually distinct frames (not title-only variants). */
const VIDEO_DATA = [
  [
    "Count with Bananas",
    "Count bananas from one to five with a bright classroom helper.",
    [
      ["bananas1", "One banana"],
      ["bananas3", "Three bananas"],
      ["bananas5", "Five bananas"],
    ],
    ["#4FC3F7", "#FFF59D"],
  ],
  [
    "Letter A Adventure",
    "Meet letter A with apple pictures and a clear chant.",
    [
      ["letterA", "Letter A"],
      ["letterA2", "A words"],
      ["letterA3", "Big A little a"],
    ],
    ["#7E57C2", "#FFE082"],
  ],
  [
    "Colour Hunt Red",
    "Find red objects around a Ghanaian home.",
    [
      ["house", "Home"],
      ["houseRed", "Red things"],
      ["red", "Colour red"],
    ],
    ["#EF9A9A", "#FFF59D"],
  ],
  [
    "Shape Circle Clip",
    "Circles everywhere — plates, moons and drums.",
    [
      ["circlePlate", "Plate circle"],
      ["circleMoon", "Moon circle"],
      ["circleDrum", "Drum circle"],
    ],
    ["#80DEEA", "#FFE082"],
  ],
  [
    "Body Parts Wave",
    "Wave your hands, stamp your feet, name each part.",
    [
      ["bodyWave1", "Wave hands"],
      ["bodyWave2", "Stamp feet"],
      ["bodyWave3", "Name parts"],
    ],
    ["#4DB6AC", "#FFF59D"],
  ],
  [
    "Market Colours",
    "Walk a bright market and name colours you see.",
    [
      ["market", "Market stalls"],
      ["orange", "Orange fruit"],
      ["ribbon", "Bright colours"],
    ],
    ["#FFCC80", "#81D4FA"],
  ],
  [
    "Animal Friends Goat",
    "Meet a friendly goat and learn its sound.",
    [
      ["goat", "Hello goat"],
      ["farm", "On the farm"],
      ["childWave", "Wave hello"],
    ],
    ["#A5D6A7", "#FFF59D"],
  ],
  [
    "Wash Hands Animation",
    "Soap, water, rinse — a short hygiene storyboard.",
    [
      ["soap", "Soap"],
      ["hands", "Wash hands"],
      ["soapRinse", "Rinse clean"],
    ],
    ["#F8BBD0", "#B3E5FC"],
  ],
  [
    "Kente Pattern Peek",
    "Watch colour bands appear like woven cloth.",
    [
      ["kentePeek1", "Two bands"],
      ["kentePeek2", "Three bands"],
      ["kentePeek3", "Full kente"],
    ],
    ["#C8E6C9", "#FFE082"],
  ],
  [
    "River Care Storyboard",
    "Keep rivers clean so fish and families thrive.",
    [
      ["fishDirty", "Dirty river"],
      ["hands", "We can help"],
      ["fishClean", "Clean river"],
    ],
    ["#81D4FA", "#C8E6C9"],
  ],
];

const videos = [];
for (let i = 0; i < VIDEO_DATA.length; i++) {
  const [title, text, frameSpecs, bg] = VIDEO_DATA[i];
  const id = `video-p2-${i + 1}`;
  const frames = frameSpecs.map(([shape, caption], idx) =>
    writeSvg(`${id}-f${idx + 1}`, shape, caption, bg)
  );
  const audio = speakEn(text, join(MEDIA, `${id}-en`));
  const mp4 = join(MEDIA, `${id}.mp4`);
  const listFile = join(MEDIA, `${id}-concat.txt`);
  // Keep all three storyboard frames on screen for the full narration
  // (avoid -shortest truncating before the last frame).
  let audioDur = 6;
  try {
    const probe = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(MEDIA, `${id}-en.mp3`)],
      { encoding: "utf8" }
    ).trim();
    audioDur = Math.max(4.5, Number.parseFloat(probe) || 6);
  } catch {
    /* default */
  }
  const frameDur = (audioDur / 3).toFixed(3);
  writeFileSync(
    listFile,
    frames.map((f) => `file '${join(ROOT, "web/public", f.path.replace(/^\//, ""))}'\nduration ${frameDur}\n`).join("") +
      `file '${join(ROOT, "web/public", frames[2].path.replace(/^\//, ""))}'\n`
  );
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-loglevel",
        "error",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listFile,
        "-i",
        join(MEDIA, `${id}-en.mp3`),
        "-vf",
        "scale=480:480:force_original_aspect_ratio=decrease,pad=480:480:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "64k",
        "-af",
        "apad",
        "-shortest",
        "-movflags",
        "+faststart",
        mp4,
      ],
      { stdio: "ignore" }
    );
  } catch {
    /* storyboard frames + audio remain usable */
  }
  const hasMp4 = existsSync(mp4);
  const remoteMedia = [
    ...frames.map((f) => ({
      kind: "remote",
      url: f.path,
      mimeType: "image/svg+xml",
      estimatedBytes: f.bytes,
      required: true,
    })),
    {
      kind: "remote",
      url: `/gigalearn/media/ghana/phase2/${id}-en.mp3`,
      mimeType: "audio/mpeg",
      estimatedBytes: audio.bytes,
      required: true,
    },
    ...(hasMp4
      ? [
          {
            kind: "remote",
            url: `/gigalearn/media/ghana/phase2/${id}.mp4`,
            mimeType: "video/mp4",
            estimatedBytes: statSync(mp4).size,
            required: false,
          },
        ]
      : []),
  ];
  videos.push(
    item({
      id,
      title,
      description: `${text} Illustrated storyboard animation for KG1–P2 (original SVG frames + spoken narration).`,
      contentType: "video_story",
      discoverCategory: "videos-animation",
      levels: ["KG1", "KG2", "P1", "P2"],
      subject: "Our World",
      topic: "Animated lessons",
      languages: ["en"],
      illustration: { kind: "emoji", emoji: "🎬", alt: `${title} animation` },
      narrations: [{ kind: "tts", text, voiceId: "english", language: "en" }],
      remoteMedia,
      rights: SPEECH,
    })
  );
}

const PIC_SEED = [
  ["Orange", "fruits", "🍊", "orange", "Which one is an orange?", ["🍊 Orange", "🍌 Banana", "🍆 Garden egg"], "🍊 Orange"],
  ["Coconut", "fruits", "🥥", "coconut", "Find the coconut.", ["🥥 Coconut", "🍎 Apple", "🍇 Grapes"], "🥥 Coconut"],
  ["Goat", "animals", "🐐", "goat", "Which animal is a goat?", ["🐐 Goat", "🐈 Cat", "🐓 Hen"], "🐐 Goat"],
  ["Hen", "animals", "🐔", "hen", "Find the hen.", ["🐔 Hen", "🐕 Dog", "🐄 Cow"], "🐔 Hen"],
  ["Red", "colours", "🟥", "red", "Which colour is red?", ["🟥 Red", "🟦 Blue", "🟩 Green"], "🟥 Red"],
  ["Blue", "colours", "🟦", "blue", "Pick blue.", ["🟦 Blue", "🟨 Yellow", "🟧 Orange"], "🟦 Blue"],
  ["Three", "numbers", "3️⃣", "number3", "How many stones? 🪨🪨🪨", ["2", "3", "4"], "3"],
  ["Five", "numbers", "5️⃣", "number5", "Count to five.", ["4", "5", "6"], "5"],
  ["Letter A", "letters", "🅰️", "letterA", "Which letter is A?", ["A", "B", "C"], "A"],
  ["Letter B", "letters", "🅱️", "letterB", "Find B.", ["A", "B", "D"], "B"],
  ["Circle", "shapes", "⭕", "circle", "Which shape is a circle?", ["⭕ Circle", "⬛ Square", "🔺 Triangle"], "⭕ Circle"],
  ["Square", "shapes", "⬛", "square", "Find the square.", ["⬛ Square", "⭕ Circle", "⭐ Star"], "⬛ Square"],
  ["Hand", "body", "✋", "hand", "Which is a hand?", ["✋ Hand", "👂 Ear", "👃 Nose"], "✋ Hand"],
  ["Eye", "body", "👁️", "eye", "Find the eye.", ["👁️ Eye", "🦷 Tooth", "🦵 Leg"], "👁️ Eye"],
  ["Cup", "household", "☕", "cup", "Which is a cup?", ["☕ Cup", "🪑 Chair", "🛏️ Bed"], "☕ Cup"],
  ["Chair", "household", "🪑", "chair", "Find the chair.", ["🪑 Chair", "🚪 Door", "🪟 Window"], "🪑 Chair"],
  ["Teacher", "occupations", "👩‍🏫", "teacher", "Who helps us learn at school?", ["Teacher", "Pilot", "Chef"], "Teacher"],
  ["Farmer", "occupations", "👩‍🌾", "farmer", "Who grows food on the farm?", ["Farmer", "Driver", "Nurse"], "Farmer"],
  ["River", "environment", "🏞️", "river", "Where does a fish live?", ["River", "Cupboard", "Book"], "River"],
  ["Tree", "environment", "🌳", "tree", "What gives us shade and fruit?", ["Tree", "Shoe", "Phone"], "Tree"],
];

const pictures = [];
for (let i = 0; i < PIC_SEED.length; i++) {
  const [title, topic, emoji, shape, prompt, options, answer] = PIC_SEED[i];
  const id = `pic-p2-${i + 1}`;
  const svg = writeSvg(id, shape, title, ["#CE93D8", "#80DEEA"]);
  const audio = speakEn(title, join(MEDIA, `${id}-en`));
  const cat =
    topic === "animals" || topic === "environment"
      ? "animals-nature"
      : topic === "numbers" || topic === "letters"
        ? "numbers-letters"
        : "pictures-objects";
  const remoteMedia = [
    { kind: "remote", url: svg.path, mimeType: "image/svg+xml", estimatedBytes: svg.bytes, required: true },
    {
      kind: "remote",
      url: `/gigalearn/media/ghana/phase2/${id}-en.mp3`,
      mimeType: "audio/mpeg",
      estimatedBytes: audio.bytes,
      required: true,
    },
  ];
  pictures.push(
    item({
      id,
      title,
      description: `See ${title.toLowerCase()}, hear the name, then play a short identification game.`,
      contentType: "picture_card",
      discoverCategory: cat,
      levels: ["KG1", "KG2", "P1", "P2"],
      subject: topic === "numbers" ? "Numeracy" : topic === "letters" ? "Language" : "Our World",
      topic,
      languages: ["en", "tw"],
      illustration: { kind: "emoji", emoji, alt: `${title} picture` },
      narrations: [
        { kind: "tts", text: title, voiceId: "english", language: "en" },
        { kind: "tts", text: title, voiceId: "abena-twi", language: "tw" },
      ],
      remoteMedia,
      game: {
        id: `${id}-g`,
        prompt,
        options,
        answer,
        feedbackCorrect: `Yes! That is ${title.toLowerCase()}.`,
        feedbackWrong: "Look again carefully.",
      },
      rights: SPEECH,
    })
  );
}

const potterSvg = writeSvg("culture-p2-potter", "potter", "Village potter", ["#FFAB91", "#FFE082"]);
const culture = [
  item({
    id: "culture-p2-potter",
    title: "Village Potter",
    description: "Potters shape clay into bowls used at home and in markets across Ghana.",
    contentType: "culture",
    discoverCategory: "culture-occupations",
    levels: ["KG2", "P1", "P2"],
    subject: "Our World",
    topic: "Occupations",
    languages: ["en"],
    culturalTheme: "pottery",
    illustration: { kind: "emoji", emoji: "🏺", alt: "Potter at work" },
    narrations: [
      {
        kind: "tts",
        text: "A potter shapes soft clay into a useful pot.",
        voiceId: "english",
        language: "en",
      },
    ],
    remoteMedia: [
      {
        kind: "remote",
        url: potterSvg.path,
        mimeType: "image/svg+xml",
        estimatedBytes: potterSvg.bytes,
        required: true,
      },
    ],
  }),
];

const gameSvg = writeSvg("game-p2-count-5", "mango", "Five mangoes", ["#FFE082", "#A5D6A7"]);
const games = [
  item({
    id: "game-p2-count-5",
    title: "Count five mangoes",
    description: "A short counting game with mangoes for KG1–P1.",
    contentType: "game",
    discoverCategory: "games",
    levels: ["KG1", "KG2", "P1"],
    subject: "Numeracy",
    topic: "Counting 1–10",
    languages: ["en", "tw"],
    illustration: { kind: "emoji", emoji: "🥭", alt: "Mangoes" },
    narrations: [
      {
        kind: "tts",
        text: "Count the mangoes: one, two, three, four, five.",
        voiceId: "english",
        language: "en",
      },
      {
        kind: "tts",
        text: "Count the mangoes: one, two, three, four, five.",
        voiceId: "abena-twi",
        language: "tw",
      },
    ],
    remoteMedia: [
      {
        kind: "remote",
        url: gameSvg.path,
        mimeType: "image/svg+xml",
        estimatedBytes: gameSvg.bytes,
        required: true,
      },
    ],
    game: {
      id: "count-5",
      prompt: "How many mangoes? 🥭🥭🥭🥭🥭",
      options: ["4", "5", "6"],
      answer: "5",
      feedbackCorrect: "Yes! Five mangoes.",
      feedbackWrong: "Count again slowly.",
    },
  }),
];

function dumpTs(varName, rows, file) {
  const body = JSON.stringify(rows, null, 2);
  const ts = `/**
 * Auto-generated by scripts/gigalearn-phase2-generate.mjs — edit the script, not this file.
 */
import type { LearningMediaItem } from "@/lib/gigalearn/mediaLibrary/types";

export const ${varName}: LearningMediaItem[] = ${body} as LearningMediaItem[];
`;
  writeFileSync(join(LIB, file), ts);
}

dumpTs("GHANA_PHASE2_RHYMES", rhymes, "catalog.ghana.rhymes.ts");
dumpTs("GHANA_PHASE2_SONGS", songs, "catalog.ghana.songs.ts");
dumpTs("GHANA_PHASE2_STORIES", stories, "catalog.ghana.stories.ts");
dumpTs("GHANA_PHASE2_VIDEOS", videos, "catalog.ghana.videos.ts");
dumpTs("GHANA_PHASE2_PICTURES", pictures, "catalog.ghana.pictures.ts");
dumpTs("GHANA_PHASE2_CULTURE", culture, "catalog.ghana.culture.ts");
dumpTs("GHANA_PHASE2_GAMES", games, "catalog.ghana.games.ts");

writeFileSync(
  join(MEDIA, "README.txt"),
  `GigaLearn Ghana Phase 2 media
Original subject-specific SVG illustrations + espeak-ng en+m3 English spoken audio (warmer male).
Songs category items are spoken lyric chants — not melodic music recordings.
Female browser TTS profiles (Abena/Naa) are unchanged.
Not educator-reviewed native-speaker recordings.
`
);

console.log(
  JSON.stringify(
    {
      rhymes: rhymes.length,
      songs: songs.length,
      stories: stories.length,
      videos: videos.length,
      pictures: pictures.length,
      culture: culture.length,
      games: games.length,
      files: readdirSync(MEDIA).length,
      mp4s: readdirSync(MEDIA).filter((f) => f.endsWith(".mp4")).length,
    },
    null,
    2
  )
);
