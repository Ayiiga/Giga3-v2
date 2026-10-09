#!/usr/bin/env node
/**
 * Generates Ghana Phase 2 Discover catalogue shards + bright SVG illustrations.
 * Run from repo root: node scripts/gigalearn-phase2-generate.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
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
    "English audio generated with espeak-ng en+m3 (warmer male). Local-language labels use browser TTS female profiles (Abena/Naa) unchanged. Not educator-reviewed native speech.",
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

function svgCard({ bg, title, shapes }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" role="img" aria-label="${title}">
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
  <text x="240" y="436" text-anchor="middle" font-family="Nunito,Segoe UI,sans-serif" font-size="28" font-weight="700" fill="#1a233f">${title}</text>
</svg>`;
}

const SVG_SHAPES = {
  mango: `<ellipse cx="230" cy="230" rx="90" ry="110" fill="#FFB300"/><ellipse cx="200" cy="200" rx="28" ry="36" fill="#FFD54F" opacity="0.55"/><path d="M230 110 C220 150 250 160 270 170" stroke="#2E7D32" stroke-width="14" fill="none" stroke-linecap="round"/><ellipse cx="290" cy="150" rx="40" ry="18" fill="#66BB6A" transform="rotate(25 290 150)"/>`,
  banana: `<path d="M140 160 Q100 260 160 340 Q210 280 200 180 Z" fill="#FDD835"/><path d="M190 150 Q160 260 200 350 Q240 290 230 170 Z" fill="#FFEE58"/><path d="M240 155 Q220 265 250 355 Q285 295 275 175 Z" fill="#FDD835"/><ellipse cx="210" cy="140" rx="40" ry="18" fill="#6D4C41"/>`,
  drum: `<ellipse cx="240" cy="150" rx="100" ry="36" fill="#FFE0B2"/><path d="M140 150 L170 330 Q240 370 310 330 L340 150" fill="#8D6E63"/><ellipse cx="240" cy="330" rx="70" ry="24" fill="#5D4037"/><path d="M155 190 C200 230 280 230 325 190" stroke="#FFD54F" stroke-width="8" fill="none"/>`,
  child: `<circle cx="240" cy="170" r="48" fill="#8D5524"/><circle cx="225" cy="165" r="5" fill="#212121"/><circle cx="255" cy="165" r="5" fill="#212121"/><path d="M225 188 Q240 200 255 188" stroke="#5D4037" stroke-width="4" fill="none"/><path d="M180 230 Q240 210 300 230 L310 340 Q240 360 170 340 Z" fill="#42A5F5"/><rect x="210" y="340" width="22" height="50" rx="8" fill="#5D4037"/><rect x="248" y="340" width="22" height="50" rx="8" fill="#5D4037"/>`,
  kente: `<rect x="80" y="120" width="320" height="220" rx="12" fill="#1B5E20"/><rect x="80" y="120" width="320" height="44" fill="#F9A825"/><rect x="80" y="208" width="320" height="44" fill="#C62828"/><rect x="80" y="296" width="320" height="44" fill="#1565C0"/><rect x="140" y="120" width="28" height="220" fill="#FFFFFF" opacity="0.9"/><rect x="240" y="120" width="28" height="220" fill="#F9A825"/>`,
  animal: `<ellipse cx="240" cy="250" rx="110" ry="70" fill="#A1887F"/><circle cx="170" cy="200" r="40" fill="#8D6E63"/><circle cx="155" cy="190" r="6" fill="#212121"/><circle cx="175" cy="190" r="6" fill="#212121"/><ellipse cx="140" cy="210" rx="14" ry="8" fill="#EF9A9A"/>`,
  number: `<text x="240" y="260" text-anchor="middle" font-family="Nunito,sans-serif" font-size="160" font-weight="800" fill="#FFFFFF">{{n}}</text>`,
  letter: `<text x="240" y="270" text-anchor="middle" font-family="Nunito,sans-serif" font-size="160" font-weight="800" fill="#FFFFFF">{{n}}</text>`,
  house: `<rect x="120" y="200" width="240" height="160" fill="#FFCC80"/><polygon points="100,200 240,100 380,200" fill="#E53935"/><rect x="210" y="260" width="60" height="100" fill="#5D4037"/><rect x="150" y="240" width="40" height="40" fill="#81D4FA"/><rect x="290" y="240" width="40" height="40" fill="#81D4FA"/>`,
  fish: `<ellipse cx="240" cy="230" rx="110" ry="55" fill="#29B6F6"/><polygon points="340,230 400,180 400,280" fill="#0288D1"/><circle cx="180" cy="215" r="10" fill="#212121"/>`,
  book: `<rect x="130" y="140" width="220" height="200" rx="12" fill="#FFECB3"/><rect x="130" y="140" width="40" height="200" fill="#FFA000"/><text x="260" y="250" text-anchor="middle" font-size="48" fill="#E65100">ABC</text>`,
};

function writeSvg(name, kind, title, bg, extra = "") {
  let shapes = SVG_SHAPES[kind] || SVG_SHAPES.mango;
  shapes = shapes.replace("{{n}}", extra);
  const path = join(MEDIA, `${name}.svg`);
  writeFileSync(path, svgCard({ bg, title, shapes }));
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
    execFileSync("rm", ["-f", wav]);
  } catch {
    /* ignore */
  }
  return { path: mp3.replace(ROOT + "/web/public", ""), bytes: statSync(mp3).size };
}

function item(partial) {
  const levels = partial.levels;
  return {
    ...GH,
    curriculumLevelId: curriculumLevel(levels),
    curriculumNote: partial.curriculumNote || "Ghana Early Years / lower primary oral language",
    ageSuitability: age(levels),
    estimatedOfflineBytes: partial.estimatedOfflineBytes ?? 3200,
    offlineEligible: true,
    rights: partial.rights || RIGHTS,
    ...partial,
  };
}

const rhymes = [];
const RHYME_LINES = [
  ["Sunrise Clap", "Sun up high, clap clap clap. Feet go tip, tip tip tap!", "☀️"],
  ["Market Morning", "To the market we all go, tomatoes red and onions in a row.", "🍅"],
  ["Rain on Roof", "Pitter patter on the roof, little drops that tell the truth.", "🌧️"],
  ["Kind Hands", "Kind hands help, kind hands share. Kind hands show that we care.", "🤝"],
  ["Five Little Goats", "Five little goats on a dusty hill, one jumps down and four stand still.", "🐐"],
  ["Accra Bus", "Yellow bus, yellow bus, take us safely home to us.", "🚌"],
  ["Plantain Song Poem", "Soft plantain, golden brown, sweetest snack in our town.", "🍌"],
  ["Clean Teeth", "Brush up, brush down, smile bright like the sun in town.", "😁"],
  ["Sharing Water", "One cup of water, cool and clear — we share with friends who are near.", "💧"],
  ["Night Cricket", "Cricket sings when lights go low, soft goodnight so dreams can grow.", "🌙"],
  ["School Bag", "Zip the bag, pack the book, walk to school with a happy look.", "🎒"],
  ["Red Kente Ribbon", "Red ribbon, gold and green — brightest colours ever seen.", "🎀"],
  ["Counting Clouds", "One white cloud, two float by, three soft clouds in a Ghana sky.", "☁️"],
  ["Honest Heart", "Tell the truth, be brave and kind — honesty grows a stronger mind.", "💛"],
  ["Little Drum Beat", "Beat the drum, soft then strong, feel the rhythm all day long.", "🥁"],
  ["Garden Beans", "Plant the beans, water slow, watch the tiny green leaves grow.", "🌱"],
  ["Friend Beside Me", "Hand in hand we walk the lane, friendship makes the sunny rain.", "👫"],
  ["Mama's Soup", "Stir the soup, smell the spice, dinner time feels warm and nice.", "🍲"],
  ["Quiet Listening", "Ears are open, mouths are still — listening well is a special skill.", "👂"],
  ["Stars Over Accra", "Stars above Accra shine, counting sparkles, one to nine.", "⭐"],
];

for (let i = 0; i < RHYME_LINES.length; i++) {
  const [title, line, emoji] = RHYME_LINES[i];
  const id = `rhyme-p2-${i + 1}`;
  const svg = writeSvg(id, i % 2 === 0 ? "child" : "book", title, ["#81D4FA", "#FFF59D"]);
  const audio = speakEn(line, join(MEDIA, `${id}-en`));
  rhymes.push(
    item({
      id,
      title,
      description: `An original nursery rhyme for KG1–P2: ${line}`,
      contentType: "rhyme_song",
      discoverCategory: "rhymes-poems",
      levels: i < 10 ? ["KG1", "KG2", "P1"] : ["KG2", "P1", "P2"],
      subject: "Language",
      topic: "Nursery rhymes",
      languages: ["en", "tw"],
      illustration: { kind: "emoji", emoji, alt: title },
      narrations: [
        { kind: "tts", text: line, voiceId: "english", language: "en" },
        { kind: "tts", text: line, voiceId: "abena-twi", language: "tw" },
      ],
      remoteMedia: [
        { kind: "remote", url: svg.path, mimeType: "image/svg+xml", estimatedBytes: svg.bytes, required: true },
        {
          kind: "remote",
          url: `/gigalearn/media/ghana/phase2/${id}-en.mp3`,
          mimeType: "audio/mpeg",
          estimatedBytes: audio.bytes,
          required: true,
        },
      ],
      rights: SPEECH,
    })
  );
}

const songs = [];
const SONG_LINES = [
  ["Clap and Count", "Clap one, clap two, clap three with me — counting is fun, you will see!"],
  ["Hello Friend", "Hello friend, how do you do? I am glad to learn with you."],
  ["Wash Your Hands", "Wash your hands, wash your hands, soap and water, clean again."],
  ["Colours Everywhere", "Red and yellow, green and blue — colours shine for me and you."],
  ["Walk to School", "Left and right, step by step, walking to school with pep."],
  ["Thank You Song", "Thank you Mama, thank you teacher — gratitude makes kindness richer."],
  ["River Fish", "Little fish in the river bright, swim along from morning light."],
  ["Farmers Dig", "Dig dig dig, plant plant plant — farmers feed our land."],
  ["Good Morning Ghana", "Good morning Ghana, skies so blue, we learn and play the whole day through."],
  ["Share the Ball", "Pass the ball, do not grab — sharing makes a happy lab."],
  ["Alphabet Bounce", "A B C, bounce with me — letters dance so playfully."],
  ["Quiet Time", "Soft as cotton, calm and slow — quiet time helps good minds grow."],
  ["Market Call", "Come buy oranges, come buy yam — market songs are Ghana's jam."],
  ["Brave Little Ant", "Ant so small but works so hard — courage lives in every yard."],
  ["Evening Prayer Poem Song", "Day is done, stars appear — thank you for the friends so dear."],
];

for (let i = 0; i < SONG_LINES.length; i++) {
  const [title, line] = SONG_LINES[i];
  const id = `song-p2-${i + 1}`;
  const svg = writeSvg(id, "child", title, ["#F48FB1", "#FFE082"]);
  const audio = speakEn(line, join(MEDIA, `${id}-en`));
  songs.push(
    item({
      id,
      title,
      description: `An original children's song for early years: ${line}`,
      contentType: "rhyme_song",
      discoverCategory: "songs",
      levels: ["KG1", "KG2", "P1", "P2"],
      subject: "Creative Arts",
      topic: "Songs",
      languages: ["en"],
      illustration: { kind: "emoji", emoji: "🎶", alt: title },
      narrations: [{ kind: "tts", text: line, voiceId: "english", language: "en" }],
      remoteMedia: [
        { kind: "remote", url: svg.path, mimeType: "image/svg+xml", estimatedBytes: svg.bytes, required: true },
        {
          kind: "remote",
          url: `/gigalearn/media/ghana/phase2/${id}-en.mp3`,
          mimeType: "audio/mpeg",
          estimatedBytes: audio.bytes,
          required: true,
        },
      ],
      game: {
        id: `${id}-q`,
        prompt: "What should we do while singing together?",
        options: ["Listen and join in", "Shout over friends", "Hide the words"],
        answer: "Listen and join in",
        feedbackCorrect: "Yes — listen and join in kindly.",
        feedbackWrong: "Try again — songs are better when we listen.",
      },
      rights: SPEECH,
    })
  );
}

const stories = [];
const STORY_SEED = [
  ["Ananse and the Sharing Pot", "Ananse found a pot of porridge. He learned that sharing made the meal sweeter.", "storytelling", "🕷️"],
  ["Ama and the Lost Pencil", "Ama told the truth about a lost pencil and found a friend.", "honesty", "✏️"],
  ["Kofi Helps Grandma", "Kofi carried water for Grandma and felt proud and kind.", "kindness", "💧"],
  ["The Market Goat", "A curious goat wandered the market until children guided it home.", "everyday", "🐐"],
  ["Fati's First Day", "Fati was shy on her first school day, then made a new friend.", "friendship", "🏫"],
  ["The Talking Drum Message", "The drum called the village to celebrate a harvest.", "drumming", "🥁"],
  ["Yaw and the Mango Tree", "Yaw waited for mangoes to ripen instead of taking them early.", "honesty", "🥭"],
  ["Efua's Rainy Walk", "Efua shared her umbrella on a rainy Accra walk.", "kindness", "☔"],
  ["The Honest Fish Seller", "A seller returned extra coins and earned trust.", "honesty", "🐟"],
  ["Little Weaver", "A child watched kente threads and learned patience.", "kente weaving", "🧵"],
  ["The Kind Class Captain", "The captain helped classmates line up fairly.", "friendship", "⭐"],
  ["Night Market Lights", "Twinkling lamps taught a child to stay close to family.", "everyday", "🏮"],
  ["Sankofa Bird", "A story about looking back to learn and move forward.", "storytelling", "🐦"],
  ["The Pot Maker's Child", "Clay hands shaped a bowl for the family.", "pottery", "🏺"],
  ["Friends at the Borehole", "Children took turns filling buckets without pushing.", "friendship", "🚰"],
  ["The Quiet Library", "Soft voices helped everyone enjoy story time.", "everyday", "📚"],
  ["Blacksmith Sparks", "Safe watching taught respect for hot metal work.", "blacksmithing", "🔨"],
  ["Farm Morning", "A family planted maize and sang while working.", "farming and fishing", "🌾"],
  ["The Helpful Sibling", "An older sibling taught counting with stones.", "kindness", "🧮"],
  ["Moon Over the Compound", "Neighbours shared stories under a bright moon.", "storytelling", "🌕"],
];

for (let i = 0; i < STORY_SEED.length; i++) {
  const [title, text, theme, emoji] = STORY_SEED[i];
  const id = `story-p2-${i + 1}`;
  const svg1 = writeSvg(`${id}-a`, "child", title, ["#80CBC4", "#FFF59D"]);
  const svg2 = writeSvg(`${id}-b`, theme.includes("drum") ? "drum" : "house", "Next", ["#90CAF9", "#FFCC80"]);
  const audio = speakEn(text, join(MEDIA, `${id}-en`));
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
      illustration: { kind: "emoji", emoji, alt: title },
      narrations: [{ kind: "tts", text, voiceId: "english", language: "en" }],
      remoteMedia: [
        { kind: "remote", url: svg1.path, mimeType: "image/svg+xml", estimatedBytes: svg1.bytes, required: true },
        { kind: "remote", url: svg2.path, mimeType: "image/svg+xml", estimatedBytes: svg2.bytes, required: true },
        {
          kind: "remote",
          url: `/gigalearn/media/ghana/phase2/${id}-en.mp3`,
          mimeType: "audio/mpeg",
          estimatedBytes: audio.bytes,
          required: true,
        },
      ],
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

const videos = [];
const VIDEO_SEED = [
  ["Count with Bananas", "Count bananas from one to five with a bright classroom helper.", "bananas"],
  ["Letter A Adventure", "Meet letter A with apple pictures and a clear chant.", "letter"],
  ["Colour Hunt Red", "Find red objects around a Ghanaian home.", "house"],
  ["Shape Circle Song Clip", "Circles everywhere — plates, moons and drums.", "drum"],
  ["Body Parts Wave", "Wave your hands, stamp your feet, name each part.", "child"],
  ["Market Colours", "Walk a bright market and name colours you see.", "kente"],
  ["Animal Friends Goat", "Meet a friendly goat and learn its sound.", "animal"],
  ["Wash Hands Animation", "Soap, water, rinse — a short hygiene storyboard.", "child"],
  ["Kente Pattern Peek", "Watch colour bands appear like woven cloth.", "kente"],
  ["River Care Storyboard", "Keep rivers clean so fish and families thrive.", "fish"],
];

for (let i = 0; i < VIDEO_SEED.length; i++) {
  const [title, text, shape] = VIDEO_SEED[i];
  const id = `video-p2-${i + 1}`;
  const frames = [1, 2, 3].map((n) =>
    writeSvg(`${id}-f${n}`, shape === "letter" ? "letter" : shape, `${title} ${n}`, ["#4FC3F7", "#FFD54F"], shape === "letter" ? "A" : String(n))
  );
  const audio = speakEn(text, join(MEDIA, `${id}-en`));
  // Lightweight “animated” mp4 from three SVG frames + audio
  const mp4 = join(MEDIA, `${id}.mp4`);
  const listFile = join(MEDIA, `${id}-concat.txt`);
  writeFileSync(
    listFile,
    frames.map((f) => `file '${join(ROOT, "web/public", f.path.replace(/^\//, ""))}'\nduration 2.2\n`).join("") +
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
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        mp4,
      ],
      { stdio: "ignore" }
    );
  } catch {
    // Fallback: still ship storyboard frames + audio without mp4
  }
  const hasMp4 = existsSync(mp4);
  videos.push(
    item({
      id,
      title,
      description: `${text} Illustrated animation for KG1–P2.`,
      contentType: "video_story",
      discoverCategory: "videos-animation",
      levels: ["KG1", "KG2", "P1", "P2"],
      subject: "Our World",
      topic: "Animated lessons",
      languages: ["en"],
      illustration: { kind: "emoji", emoji: "🎬", alt: title },
      narrations: [{ kind: "tts", text, voiceId: "english", language: "en" }],
      remoteMedia: [
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
      ],
      rights: SPEECH,
    })
  );
}

const pictures = [];
const PIC_SEED = [
  ["Orange", "fruits", "🍊", "Which one is an orange?", ["🍊 Orange", "🍌 Banana", "🍆 Garden egg"], "🍊 Orange"],
  ["Coconut", "fruits", "🥥", "Find the coconut.", ["🥥 Coconut", "🍎 Apple", "🍇 Grapes"], "🥥 Coconut"],
  ["Goat", "animals", "🐐", "Which animal is a goat?", ["🐐 Goat", "🐈 Cat", "🐓 Hen"], "🐐 Goat"],
  ["Hen", "animals", "🐔", "Find the hen.", ["🐔 Hen", "🐕 Dog", "🐄 Cow"], "🐔 Hen"],
  ["Red", "colours", "🟥", "Which colour is red?", ["🟥 Red", "🟦 Blue", "🟩 Green"], "🟥 Red"],
  ["Blue", "colours", "🟦", "Pick blue.", ["🟦 Blue", "🟨 Yellow", "🟧 Orange"], "🟦 Blue"],
  ["Three", "numbers", "3️⃣", "How many stones? 🪨🪨🪨", ["2", "3", "4"], "3"],
  ["Five", "numbers", "5️⃣", "Count to five.", ["4", "5", "6"], "5"],
  ["Letter A", "letters", "🅰️", "Which letter is A?", ["A", "B", "C"], "A"],
  ["Letter B", "letters", "🅱️", "Find B.", ["A", "B", "D"], "B"],
  ["Circle", "shapes", "⭕", "Which shape is a circle?", ["⭕ Circle", "⬛ Square", "🔺 Triangle"], "⭕ Circle"],
  ["Square", "shapes", "⬛", "Find the square.", ["⬛ Square", "⭕ Circle", "⭐ Star"], "⬛ Square"],
  ["Hand", "body", "✋", "Which is a hand?", ["✋ Hand", "👂 Ear", "👃 Nose"], "✋ Hand"],
  ["Eye", "body", "👁️", "Find the eye.", ["👁️ Eye", "🦷 Tooth", "🦵 Leg"], "👁️ Eye"],
  ["Cup", "household", "☕", "Which is a cup?", ["☕ Cup", "🪑 Chair", "🛏️ Bed"], "☕ Cup"],
  ["Chair", "household", "🪑", "Find the chair.", ["🪑 Chair", "🚪 Door", "🪟 Window"], "🪑 Chair"],
  ["Teacher", "occupations", "👩‍🏫", "Who helps us learn at school?", ["Teacher", "Pilot", "Chef"], "Teacher"],
  ["Farmer", "occupations", "👩‍🌾", "Who grows food on the farm?", ["Farmer", "Driver", "Nurse"], "Farmer"],
  ["River", "environment", "🏞️", "Where does a fish live?", ["River", "Cupboard", "Book"], "River"],
  ["Tree", "environment", "🌳", "What gives us shade and fruit?", ["Tree", "Shoe", "Phone"], "Tree"],
];

for (let i = 0; i < PIC_SEED.length; i++) {
  const [title, topic, emoji, prompt, options, answer] = PIC_SEED[i];
  const id = `pic-p2-${i + 1}`;
  const shape =
    topic === "animals"
      ? "animal"
      : topic === "numbers"
        ? "number"
        : topic === "letters"
          ? "letter"
          : topic === "environment"
            ? "fish"
            : "mango";
  const svg = writeSvg(id, shape, title, ["#CE93D8", "#80DEEA"], title.slice(0, 1));
  const audio = speakEn(title, join(MEDIA, `${id}-en`));
  const cat =
    topic === "animals" || topic === "environment"
      ? "animals-nature"
      : topic === "numbers" || topic === "letters"
        ? "numbers-letters"
        : "pictures-objects";
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
      illustration: { kind: "emoji", emoji, alt: title },
      narrations: [
        { kind: "tts", text: title, voiceId: "english", language: "en" },
        { kind: "tts", text: title, voiceId: "abena-twi", language: "tw" },
      ],
      remoteMedia: [
        { kind: "remote", url: svg.path, mimeType: "image/svg+xml", estimatedBytes: svg.bytes, required: true },
        {
          kind: "remote",
          url: `/gigalearn/media/ghana/phase2/${id}-en.mp3`,
          mimeType: "audio/mpeg",
          estimatedBytes: audio.bytes,
          required: true,
        },
      ],
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

// Culture / occupations / games extras from phase1 migration helpers
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
    illustration: { kind: "emoji", emoji: "🏺", alt: "Potter" },
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
        url: writeSvg("culture-p2-potter", "house", "Potter", ["#FFAB91", "#FFE082"]).path,
        mimeType: "image/svg+xml",
        estimatedBytes: 900,
        required: true,
      },
    ],
  }),
];

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
  // Convert JSON to TS with `as const` helpers via LearningMediaItem[]
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
Original SVG illustrations + espeak-ng en+m3 English audio (warmer male).
Female browser TTS profiles (Abena/Naa) are unchanged.
Not educator-reviewed native-speaker recordings.
`
);

const counts = {
  rhymes: rhymes.length,
  songs: songs.length,
  stories: stories.length,
  videos: videos.length,
  pictures: pictures.length,
  culture: culture.length,
  games: games.length,
  files: readdirSync(MEDIA).length,
};
console.log(JSON.stringify(counts, null, 2));
