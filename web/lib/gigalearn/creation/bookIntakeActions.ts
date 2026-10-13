import type { CreationInputs, FieldValue } from "@/lib/gigalearn/creation/types";

/** Pending book chat fields (order matches BOOK_FIELDS askUpfront required). */
export type BookPendingField =
  | "title"
  | "subject"
  | "audience"
  | "purpose"
  | "tone"
  | "chapterCount"
  | "genre"
  | null;

export type BookIntakeAction =
  | { type: "cancel" }
  | { type: "restart" }
  | { type: "skip" }
  | { type: "title_brainstorm"; topicHint: string }
  | { type: "title_pick"; index: number }
  | { type: "title_use"; title: string }
  | { type: "set_fields"; patches: CreationInputs; resumePending?: string | null; preface?: string }
  | { type: "chapter_topics"; topics: string[]; suggestedCount: number }
  | { type: "educational"; question: string }
  | { type: "field_answer"; text: string };

const SKIP = /^(skip|pass|none|n\/?a|no preference|you decide|suggest one|default)\b/i;
const TITLE_BRAINSTORM =
  /\b(brainstorm|suggest|recommend|investigate|list|give me|propose|come up with)\b[\s\S]{0,80}\b(titles?|name for (the |my )?book|book titles?)\b/i;
const TITLE_LIST_AGAIN =
  /\b(list|show|give)\b[\s\S]{0,40}\b(suggested|your|the)\b[\s\S]{0,20}\btitles?\b/i;
const TITLE_PICK_INDEX = /^(?:i(?:'|’)?ll\s+take\s+|use\s+|pick\s+|choose\s+|go with\s+|#)?\s*(\d{1,2})\s*[.)]?\s*$/i;
const SUBJECT_CHANGE =
  /\b(?:change|switch|update)\s+(?:the\s+)?(?:subject|topic)\s+to\b|\b(?:subject|topic)\s*[:=]\s*/i;
const DETAILS_ABOUT =
  /\b(?:give me details|write about|focus on|cover|about)\b[\s\S]{0,20}\b(.{4,120}?)(?:\s+for\s+|\s*[.?!]|$)/i;
const EDUCATIONAL_Q =
  /^(what|how|why|when|where|which|who|explain|describe|list the|tell me)\b|\?\s*$/i;
const CHAPTER_TOPICS =
  /\b(chapter\s+topics?|chapter\s+plan|chapter outline|include chapters?\s+on|these chapters?)\b/i;
const REGION_AUDIENCE =
  /^(global|africa|worldwide|ghana|west africa|east africa|nigeria|kenya|south africa)([,\s]+(global|africa|worldwide|ghana|west africa))?[.!]?\s*$/i;
const TONE_WORD =
  /^(warm and simple|formal|conversational|inspirational|technical|friendly|academic|simple)[.!]?\s*$/i;

function stripTrailingPunct(text: string): string {
  return text.trim().replace(/[.!?,;:]+$/g, "").trim();
}

export function extractJhsAudience(text: string): string | null {
  const jhs = text.match(/\bjhs\s*-?\s*([1-3])\b/i);
  if (jhs) return `JHS ${jhs[1]} students`;
  const basic = text.match(/\b(?:basic|class|primary)\s*-?\s*(\d{1,2})\b/i);
  if (basic) {
    const n = Number(basic[1]);
    if (n >= 1 && n <= 9) return `Basic ${n} learners`;
  }
  return null;
}

export function extractSubjectFromDetails(text: string): string | null {
  const about = text.match(
    /\b(?:details about|write about|focus on|topic of|subject(?: is)?|about)\s+(.+?)(?:\s+for\s+(?:jhs|basic|class|primary|shs|students?|learners?)|\s*[.?!]|$)/i
  );
  if (about?.[1]) {
    const subject = about[1].trim().replace(/[.?!]+$/, "");
    if (subject.length >= 4) return subject.charAt(0).toUpperCase() + subject.slice(1);
  }
  if (/\bseparation of mixtures\b/i.test(text)) return "Separation of mixtures";
  return null;
}

export function looksLikeChapterTopicList(text: string): boolean {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim())
    .filter((line) => line.length >= 3);
  if (lines.length >= 3) return true;
  if (CHAPTER_TOPICS.test(text) && text.length > 40) return true;
  // Comma / semicolon separated methods without being a short field answer
  const parts = text.split(/[,;]/).map((p) => p.trim()).filter((p) => p.length > 2);
  return parts.length >= 4 && !/^\d+$/.test(text.trim());
}

export function parseChapterTopics(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim())
    .filter((line) => line.length >= 3);
  if (lines.length >= 2) return lines.slice(0, 30);
  return text
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3)
    .slice(0, 30);
}

/** Local title brainstorm — creative options, not claimed viral research. */
export function brainstormBookTitles(topicHint: string, inputs: CreationInputs): string[] {
  const blob = `${topicHint} ${String(inputs.subject ?? "")} ${String(inputs.audience ?? "")}`;
  const africa = /\bafrica\b/i.test(blob);
  const jhs = /\bjhs|junior high|basic\s*[6-9]\b/i.test(blob);
  const mixtures = /\bseparation of mixtures|mixtures\b/i.test(blob);
  const ai = /\b\bai\b|artificial intelligence\b/i.test(blob);

  if (mixtures || jhs) {
    return [
      "Separating Mixtures: A Clear Guide for JHS 2",
      "Clean Cuts: How We Separate Mixtures",
      "From Muddy Water to Clear Answers",
      "Sieves, Magnets and Steam: Mixture Methods",
      "Science Everyday: Separating What We Mix",
      "Lab to Life: Separation Techniques for JHS",
      "What Stays, What Goes: Mixture Separation",
      "JHS Science Simplified: Separation of Mixtures",
      "Hands-On Separation for Curious Learners",
      "Pure Science: Separating Mixtures Step by Step",
    ];
  }

  if (ai) {
    const region = africa ? "Africa" : "Our Connected World";
    return [
      `AI Everywhere: Practical Intelligence for ${region}`,
      "The Curious Mind's Guide to Artificial Intelligence",
      "Smart Tools, Human Choices: Living with AI",
      africa
        ? "AI for Africa's Next Builders"
        : "How AI Is Changing Everyday Life",
      "Ask Better Questions: Thinking Clearly in the Age of AI",
      "From Chatbots to Choices: Understanding AI",
      africa
        ? "Digital Horizons: AI Across African Cities and Classrooms"
        : "The Global AI Conversation",
      "Learning with Machines Without Losing Ourselves",
      "AI Myths vs Reality: A Practical Tour",
      "Tomorrow's Toolkit: AI Skills Anyone Can Start",
    ];
  }

  const topic =
    String(inputs.subject ?? "").trim() ||
    topicHint.replace(TITLE_BRAINSTORM, "").replace(TITLE_LIST_AGAIN, "").trim() ||
    "Your Topic";
  const short = topic.length > 48 ? `${topic.slice(0, 45)}…` : topic;
  return [
    `${short}: A Practical Guide`,
    `Understanding ${short}`,
    `The Clear Path to ${short}`,
    `${short} Explained`,
    `Mastering ${short} Step by Step`,
    `Everyday ${short}`,
    `${short} for Curious Minds`,
    `A Fresh Look at ${short}`,
  ];
}

export function defaultSeparationOutline(): string[] {
  return [
    "What mixtures are and why we separate them",
    "Handpicking, sieving, winnowing and magnetic separation",
    "Sedimentation, decantation and filtration",
    "Evaporation and crystallisation",
    "Distillation and chromatography (JHS-appropriate intro)",
    "Practical activities and everyday examples",
    "Safety, common mistakes and revision questions",
    "Assessment practice and key terms",
  ];
}

export function formatTitleSuggestions(titles: string[], recommendedIndex = 0): string {
  const lines = titles.map((title, i) => `${i + 1}. ${title}`).join("\n");
  const pick = titles[recommendedIndex] ?? titles[0]!;
  return [
    "Here are title options you can use or adapt. These are creative suggestions — not a guarantee of going viral, and not based on live web research unless you ask for that separately.",
    "",
    lines,
    "",
    `**Recommended:** ${pick}`,
    "",
    "Reply with a **number**, paste a title you like, ask for **more options**, or type your own title.",
  ].join("\n");
}

export function classifyBookIntakeMessage(args: {
  text: string;
  pendingFieldId: string | null;
  inputs: CreationInputs;
  titleSuggestions?: string[];
}): BookIntakeAction {
  const text = args.text.trim();
  const pending = args.pendingFieldId;

  if (/^(cancel|stop|exit|quit|never\s*mind|nevermind)\b/i.test(text)) return { type: "cancel" };
  if (/^(start\s+over|restart|reset)\b/i.test(text)) return { type: "restart" };
  if (SKIP.test(text)) return { type: "skip" };

  if (TITLE_BRAINSTORM.test(text) || TITLE_LIST_AGAIN.test(text)) {
    return { type: "title_brainstorm", topicHint: text };
  }

  if (args.titleSuggestions?.length) {
    const pick = text.match(TITLE_PICK_INDEX);
    if (pick) {
      const index = Number(pick[1]);
      if (index >= 1 && index <= args.titleSuggestions.length) {
        return { type: "title_pick", index };
      }
    }
    const quoted = text.match(/^["“'](.+?)["”']$/);
    if (quoted) return { type: "title_use", title: quoted[1]!.trim() };
    const exact = args.titleSuggestions.find(
      (title) => title.toLowerCase() === stripTrailingPunct(text).toLowerCase()
    );
    if (exact) return { type: "title_use", title: exact };
  }

  const subjectFromChange = text.match(
    /(?:change|switch|update)\s+(?:the\s+)?(?:subject|topic)\s+to\s+(.+)/i
  );
  if (subjectFromChange?.[1]) {
    const subject = stripTrailingPunct(subjectFromChange[1]);
    const audience = extractJhsAudience(text);
    const patches: CreationInputs = { subject };
    if (audience) patches.audience = audience;
    return {
      type: "set_fields",
      patches,
      preface: `Updated the subject to **${subject}**.`,
    };
  }

  const detailsSubject = extractSubjectFromDetails(text);
  if (detailsSubject && (DETAILS_ABOUT.test(text) || /\bfor\s+jhs\b/i.test(text))) {
    const jhsAudience = extractJhsAudience(text);
    const prior = typeof args.inputs.audience === "string" ? args.inputs.audience : "";
    const regionKeep =
      prior && /\b(global|africa)\b/i.test(prior) && jhsAudience
        ? `${jhsAudience} (${prior})`
        : jhsAudience || prior || undefined;
    const patches: CreationInputs = { subject: detailsSubject };
    if (regionKeep) patches.audience = regionKeep;
    if (!args.inputs.purpose) {
      patches.purpose = `Teach ${detailsSubject} clearly for ${regionKeep || "learners"}, with practical examples and revision support.`;
    }
    return {
      type: "set_fields",
      patches,
      preface: `Noted — the book will focus on **${detailsSubject}**${regionKeep ? ` for **${regionKeep}**` : ""}.`,
    };
  }

  if (REGION_AUDIENCE.test(text) && (pending === "audience" || pending === "title" || pending === "subject")) {
    const region = stripTrailingPunct(text).replace(/\s*,\s*/g, " / ");
    return {
      type: "set_fields",
      patches: { audience: region },
      preface: `I'll keep the audience/context as **${region}**.`,
      resumePending: pending === "audience" ? undefined : pending,
    };
  }

  if (TONE_WORD.test(text) && (pending === "tone" || args.inputs.tone == null || pending === "purpose" || pending === "chapterCount")) {
    const toneRaw = stripTrailingPunct(text);
    const tone =
      toneRaw.toLowerCase() === "formal"
        ? "Formal"
        : toneRaw.charAt(0).toUpperCase() + toneRaw.slice(1);
    return {
      type: "set_fields",
      patches: { tone },
      preface: `Tone set to **${tone}**.`,
    };
  }

  // Content questions must never be stored as title/subject/count answers.
  if (EDUCATIONAL_Q.test(text)) {
    if (
      pending === "title" ||
      pending === "chapterCount" ||
      pending === "genre" ||
      pending === "tone" ||
      pending === "purpose" ||
      pending === "subject" ||
      pending === "audience" ||
      text.includes("?")
    ) {
      return { type: "educational", question: text };
    }
  }

  if (pending === "chapterCount" && !isNumericChapterCountAnswer(text)) {
    if (/\bseparation of mixtures\b/i.test(text) || EDUCATIONAL_Q.test(text)) {
      return { type: "educational", question: text };
    }
  }

  if (
    (pending === "chapterCount" || looksLikeChapterTopicList(text)) &&
    (looksLikeChapterTopicList(text) || (CHAPTER_TOPICS.test(text) && !/^\d+$/.test(text)))
  ) {
    let topics = parseChapterTopics(text);
    if (/\bmethods of separation of mixtures\b/i.test(text) || /\bseparation of mixtures\b/i.test(text)) {
      topics = defaultSeparationOutline();
    }
    const suggestedCount = Math.min(30, Math.max(3, topics.length));
    return { type: "chapter_topics", topics, suggestedCount };
  }

  // Long brainstorm-like messages while title is pending are requests, not titles.
  if (
    pending === "title" &&
    (/\b(brainstorm|suggest|recommend|investigate|viral|list)\b/i.test(text) || text.length > 120)
  ) {
    return { type: "title_brainstorm", topicHint: text };
  }

  return { type: "field_answer", text };
}

export function isNumericChapterCountAnswer(text: string): boolean {
  const t = text.trim();
  if (/^\d{1,2}$/.test(t)) return true;
  if (/^\d{1,2}\s*chapters?\s*[.!]?$/i.test(t)) return true;
  if (/^(about|around|roughly)\s+\d{1,2}\s*(chapters?)?[.!]?$/i.test(t)) return true;
  return false;
}

export function applySkip(
  pendingFieldId: string | null,
  inputs: CreationInputs
): { inputs: CreationInputs; skippedId: string | null } {
  if (!pendingFieldId) return { inputs, skippedId: null };
  const next = { ...inputs };
  // Optional-friendly defaults when skipping required chat fields
  if (pendingFieldId === "purpose" && !next.purpose) {
    next.purpose = "Help readers understand the subject clearly and practically.";
  }
  if (pendingFieldId === "genre" && !next.genre) {
    next.genre = "Educational";
  }
  if (pendingFieldId === "chapterCount" && !next.chapterCount) {
    next.chapterCount = "8";
  }
  if (pendingFieldId === "tone" && !next.tone) {
    next.tone = "Warm and simple";
  }
  return { inputs: next, skippedId: pendingFieldId };
}

export function educationalBookReply(question: string, inputs: CreationInputs): string {
  const subject = String(inputs.subject ?? "your topic");
  const audience = String(inputs.audience ?? "learners");
  const mixtures =
    /\bseparation of mixtures\b/i.test(question) || /\bseparation of mixtures\b/i.test(subject);

  if (mixtures) {
    const outline = defaultSeparationOutline();
    return [
      `For **${audience}**, separation of mixtures is about using physical methods to get useful parts out of a mixture — without changing substances into new ones chemically.`,
      "",
      "**Core methods (JHS-appropriate):**",
      "- **Handpicking / sieving / winnowing** — size and weight differences",
      "- **Magnetic separation** — magnetic materials from non-magnetic ones",
      "- **Sedimentation & decantation** — denser solids settle; pour off liquid",
      "- **Filtration** — solids from liquids with filter paper/cloth",
      "- **Evaporation & crystallisation** — dissolve solids recovered from solution",
      "- **Distillation** — liquids with different boiling points (intro level)",
      "- **Chromatography** — separating dissolved dyes/inks (intro demos)",
      "",
      "**Suggested chapter outline:**",
      ...outline.map((line, i) => `${i + 1}. ${line}`),
      "",
      `I can use this as the chapter plan for your book on **${subject}**. Reply **use this outline** (or paste edits), or enter a **chapter count** (1–30).`,
    ].join("\n");
  }

  return [
    `Here's a concise teaching-oriented answer for **${audience}** on **${subject}**:`,
    "",
    `Focus on clear definitions, everyday examples, step-by-step methods, safety, and short practice questions. If you want this structured into chapters, reply with **suggest an outline** or a chapter count.`,
    "",
    question.includes("?")
      ? "_I've kept your book details saved — ask me to continue the book setup whenever you're ready._"
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function fieldValueAsString(value: FieldValue | undefined): string {
  if (value == null) return "";
  return Array.isArray(value) ? value.join(", ") : String(value);
}
