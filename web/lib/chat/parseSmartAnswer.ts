/**
 * Detect Giga3 Smart Answers in assistant markdown.
 * Headings stay ordinary markdown so partial or older replies still render.
 */

export type SmartAnswerSectionId =
  | "quick"
  | "definition"
  | "explanation"
  | "points"
  | "example"
  | "practice"
  | "next";

export type SmartAnswerSection = {
  id: SmartAnswerSectionId;
  label: string;
  emoji: string;
  content: string;
};

export type ParsedSmartAnswer = {
  isSmart: boolean;
  title: string | null;
  preamble: string;
  sections: SmartAnswerSection[];
  appendix: string;
  plainContent: string;
};

type SectionDef = {
  id: SmartAnswerSectionId;
  label: string;
  emoji: string;
  aliases: string[];
  emojiAliases: string[];
};

const SECTIONS: SectionDef[] = [
  {
    id: "quick",
    label: "Quick Answer",
    emoji: "⚡",
    aliases: ["quick answer"],
    emojiAliases: ["answer", "quick answer"],
  },
  {
    id: "definition",
    label: "Simple Definition",
    emoji: "📘",
    aliases: ["simple definition"],
    emojiAliases: ["definition", "simple definition"],
  },
  {
    id: "explanation",
    label: "More Complete Explanation",
    emoji: "🧠",
    aliases: ["more complete explanation", "complete explanation"],
    emojiAliases: ["explanation", "more complete explanation", "complete explanation"],
  },
  {
    id: "points",
    label: "Key Points",
    emoji: "🔑",
    aliases: ["key points", "key point"],
    emojiAliases: ["points", "key points", "key point"],
  },
  {
    id: "example",
    label: "Real-World Example",
    emoji: "🌍",
    aliases: ["real-world example", "real world example"],
    emojiAliases: ["example", "real-world example", "real world example"],
  },
  {
    id: "practice",
    label: "Practice / Try It",
    emoji: "📝",
    aliases: ["practice / try it", "try it"],
    emojiAliases: ["practice", "try it", "practice / try it"],
  },
  {
    id: "next",
    label: "Next Step",
    emoji: "🚀",
    aliases: ["next step", "next steps"],
    emojiAliases: ["next", "next step", "next steps"],
  },
];

const HEADING_RE = /^#{1,3}[ \t]+(.+?)\s*$/;
const APPENDIX_RE = /^#{1,3}[ \t]+(Verification|Evidence|Confidence)\s*$/i;
const FENCE_RE = /^```/;

function stripVariationSelectors(value: string): string {
  return value.replace(/\uFE0F/g, "");
}

function normalizeLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitHeadingDecor(raw: string): { emoji: string | null; label: string } {
  let text = raw.trim().replace(/^\*\*(.+)\*\*$/, "$1").replace(/[:：]\s*$/, "").trim();
  const leading = text.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*/u);
  let emoji: string | null = null;
  if (leading) {
    emoji = stripVariationSelectors(leading[1]);
    text = text.slice(leading[0].length).trim();
  }
  const trailing = text.match(/\s+(\p{Extended_Pictographic}\uFE0F?)$/u);
  if (!emoji && trailing) {
    emoji = stripVariationSelectors(trailing[1]);
    text = text.slice(0, trailing.index).trim();
  }
  return { emoji, label: normalizeLabel(text) };
}

function matchSection(emoji: string | null, label: string): SectionDef | null {
  if (!label && !emoji) return null;
  for (const section of SECTIONS) {
    if (label && section.aliases.includes(label)) return section;
  }
  if (!emoji || !label) return null;
  const normalizedEmoji = stripVariationSelectors(emoji);
  for (const section of SECTIONS) {
    if (
      stripVariationSelectors(section.emoji) === normalizedEmoji &&
      section.emojiAliases.includes(label)
    ) {
      return section;
    }
  }
  return null;
}

function matchSmartHeading(line: string): SectionDef | null {
  const heading = line.match(HEADING_RE);
  if (!heading) return null;
  const { emoji, label } = splitHeadingDecor(heading[1]);
  return matchSection(emoji, label);
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

function splitLead(lead: string): { title: string | null; preamble: string } {
  const trimmed = lead.trim();
  if (!trimmed) return { title: null, preamble: "" };
  const lines = trimmed.split("\n");
  const first = lines[0].trim();
  const heading = first.match(/^#{1,2}[ \t]+(.+)$/);
  if (heading) {
    return {
      title: cleanTitle(heading[1]),
      preamble: lines.slice(1).join("\n").trim(),
    };
  }
  const bold = first.match(/^\*\*(.+)\*\*$/);
  if (bold && (lines.length === 1 || lines[1].trim() === "")) {
    return {
      title: cleanTitle(bold[1]),
      preamble: lines.slice(2).join("\n").trim(),
    };
  }
  return { title: null, preamble: trimmed };
}

function emptyParse(raw: string): ParsedSmartAnswer {
  return {
    isSmart: false,
    title: null,
    preamble: "",
    sections: [],
    appendix: "",
    plainContent: raw,
  };
}

/**
 * Returns isSmart when at least one recognized section has body text.
 * Empty headings are dropped. Unknown headings stay inside the current section.
 */
export function parseSmartAnswer(raw: string): ParsedSmartAnswer {
  const text = raw.replace(/\r\n/g, "\n");
  if (!text.trim()) return emptyParse(raw);

  const lines = text.split("\n");
  const lead: string[] = [];
  const sections: SmartAnswerSection[] = [];
  const appendix: string[] = [];
  let inFence = false;
  let inAppendix = false;
  let current: { def: SectionDef; lines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const content = current.lines.join("\n").trim();
    if (content) {
      sections.push({
        id: current.def.id,
        label: current.def.label,
        emoji: current.def.emoji,
        content,
      });
    }
    current = null;
  };

  for (const line of lines) {
    if (inAppendix) {
      appendix.push(line);
      continue;
    }
    if (FENCE_RE.test(line.trim())) {
      inFence = !inFence;
      (current ? current.lines : lead).push(line);
      continue;
    }
    if (!inFence && current && APPENDIX_RE.test(line.trim())) {
      flush();
      inAppendix = true;
      appendix.push(line);
      continue;
    }
    if (!inFence) {
      const section = matchSmartHeading(line);
      if (section) {
        flush();
        current = { def: section, lines: [] };
        continue;
      }
    }
    (current ? current.lines : lead).push(line);
  }
  flush();

  if (sections.length === 0) return emptyParse(raw);

  const { title, preamble } = splitLead(lead.join("\n"));
  return {
    isSmart: true,
    title,
    preamble,
    sections,
    appendix: appendix.join("\n").trim(),
    plainContent: raw,
  };
}

function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~`>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Plain speech text that keeps section names and drops markdown marks. */
export function smartAnswerSpokenText(parsed: ParsedSmartAnswer): string {
  const chunks: string[] = [];
  if (parsed.title) chunks.push(parsed.title);
  const preamble = stripMarkdownForSpeech(parsed.preamble);
  if (preamble) chunks.push(preamble);
  for (const section of parsed.sections) {
    const body = stripMarkdownForSpeech(section.content);
    chunks.push(body ? `${section.label}. ${body}` : section.label);
  }
  const appendix = stripMarkdownForSpeech(parsed.appendix);
  if (appendix) chunks.push(appendix);
  return chunks.join("\n\n");
}
