/** Parse assistant markdown into premium answer blocks (introduction / main / conclusion). */

import { splitAssistantResponseDisplay } from "@/lib/chat/deriveResponseDisplay";

export type AnswerBlockKind = "introduction" | "main" | "conclusion";

export type AnswerBlockSection = {
  kind: AnswerBlockKind;
  label: string;
  content: string;
};

export type ParsedAnswerBlocks = {
  title: string | null;
  blocks: AnswerBlockSection[];
  isStructured: boolean;
  /** Body for non-structured fallback rendering */
  plainContent: string;
};

const SECTION_PATTERNS: { kind: AnswerBlockKind; label: string; pattern: RegExp }[] = [
  {
    kind: "introduction",
    label: "Introduction",
    pattern: /^#{1,3}\s*(?:🔹\s*)?(?:Introduction|Intro)\s*$/im,
  },
  {
    kind: "main",
    label: "Main message",
    pattern:
      /^#{1,3}\s*(?:💬\s*)?(?:Main(?:\s+(?:message|answer|content|response))?|Answer|Body|Response)\s*$/im,
  },
  {
    kind: "conclusion",
    label: "Conclusion",
    pattern: /^#{1,3}\s*(?:✅\s*)?(?:Conclusion|Summary|Closing|Wrap-up)\s*$/im,
  },
];

type Marker = { index: number; length: number; section: (typeof SECTION_PATTERNS)[number] };

function findSectionMarkers(text: string): Marker[] {
  const markers: Marker[] = [];
  for (const section of SECTION_PATTERNS) {
    const match = section.pattern.exec(text);
    if (match?.index !== undefined) {
      markers.push({ index: match.index, length: match[0].length, section });
    }
  }
  markers.sort((a, b) => a.index - b.index);
  return markers;
}

function stripLeadingBlankLines(text: string): string {
  return text.replace(/^\n+/, "").trim();
}

function looksLikeSpecialistOutline(paragraph: string): boolean {
  return /^(#{1,6}\s|🔎|📚|💡|⚠️|📖|<!--)/.test(paragraph.trim());
}

/**
 * When the model writes a long answer without section headings, lift the
 * opening paragraph and the closing paragraph out of the body so each can
 * be copied, shared, or read on its own.
 */
function splitProseSections(body: string): AnswerBlockSection[] | null {
  if (body.includes("```")) return null;
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length < 3) return null;

  const intro = paragraphs[0];
  const conclusion = paragraphs[paragraphs.length - 1];
  const main = paragraphs.slice(1, -1).join("\n\n").trim();
  if (looksLikeSpecialistOutline(intro) || looksLikeSpecialistOutline(conclusion)) return null;
  if (intro.length < 40 || intro.length > 500) return null;
  if (conclusion.length < 40 || conclusion.length > 500) return null;
  if (main.length < 80) return null;

  return [
    { kind: "introduction", label: "Introduction", content: intro },
    { kind: "main", label: "Main message", content: main },
    { kind: "conclusion", label: "Conclusion", content: conclusion },
  ];
}

/**
 * When three labeled sections are present, split into premium answer blocks.
 * Otherwise returns isStructured: false and the original display split.
 */
export function parseAnswerBlocks(raw: string): ParsedAnswerBlocks {
  const display = splitAssistantResponseDisplay(raw);
  const body = display.content.trim();
  const markers = findSectionMarkers(body);

  if (markers.length < 2) {
    const prose = splitProseSections(body);
    if (prose) {
      return {
        title: display.title,
        blocks: prose,
        isStructured: true,
        plainContent: display.content,
      };
    }
    return {
      title: display.title,
      blocks: [],
      isStructured: false,
      plainContent: display.content,
    };
  }

  const blocks: AnswerBlockSection[] = [];
  for (let i = 0; i < markers.length; i += 1) {
    const marker = markers[i];
    const next = markers[i + 1];
    const sliceStart = marker.index + marker.length;
    const sliceEnd = next?.index ?? body.length;
    const content = stripLeadingBlankLines(body.slice(sliceStart, sliceEnd));
    if (!content) continue;
    blocks.push({
      kind: marker.section.kind,
      label: marker.section.label,
      content,
    });
  }

  const kinds = new Set(blocks.map((b) => b.kind));
  const isStructured = blocks.length >= 2 && (kinds.has("main") || blocks.length >= 3);

  if (!isStructured) {
    return {
      title: display.title,
      blocks: [],
      isStructured: false,
      plainContent: display.content,
    };
  }

  return {
    title: display.title,
    blocks,
    isStructured: true,
    plainContent: display.content,
  };
}
