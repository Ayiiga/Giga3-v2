/** Pure markdown block parser for assistant chat replies (no React). */

export interface MarkdownListItem {
  content: string;
  children?: MarkdownBlock[];
}

export type MarkdownBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "code"; language: string; code: string }
  | { type: "mermaid"; code: string }
  | { type: "visual"; specJson: string }
  | { type: "chart"; specJson: string }
  | { type: "ul"; items: MarkdownListItem[] }
  | { type: "ol"; items: MarkdownListItem[] }
  | { type: "table"; headers: string[]; rows: string[][] };

type ListKind = "ul" | "ol";

interface ListMarker {
  indent: number;
  kind: ListKind;
  content: string;
}

function measureIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].replace(/\t/g, "  ").length : 0;
}

function parseListItemMarker(line: string): ListMarker | null {
  const indent = measureIndent(line);
  const trimmed = line.slice(indent);
  const bullet = trimmed.match(/^[-*]\s+(.+)$/);
  if (bullet) return { indent, kind: "ul", content: bullet[1] };
  const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
  if (ordered) return { indent, kind: "ol", content: ordered[1] };
  return null;
}

function findNextNonBlank(lines: string[], from: number): number {
  for (let i = from; i < lines.length; i += 1) {
    if (lines[i].trim() !== "") return i;
  }
  return -1;
}

function isBlankLineContinuation(
  lines: string[],
  index: number,
  baseIndent: number,
  kind: ListKind
): boolean {
  if (lines[index].trim() !== "") return false;
  const next = findNextNonBlank(lines, index + 1);
  if (next === -1) return false;
  const marker = parseListItemMarker(lines[next]);
  return marker !== null && marker.kind === kind && marker.indent === baseIndent;
}

function parseNestedLists(
  lines: string[],
  start: number,
  baseIndent: number,
  parent: MarkdownListItem
): number {
  let i = start;
  while (i < lines.length) {
    if (lines[i].trim() === "") {
      const next = findNextNonBlank(lines, i + 1);
      if (next === -1) break;
      const nextMarker = parseListItemMarker(lines[next]);
      if (!nextMarker || nextMarker.indent <= baseIndent) break;
      i = next;
      continue;
    }

    const marker = parseListItemMarker(lines[i]);
    if (!marker || marker.indent <= baseIndent) break;

    const nested = parseListBlock(lines, i);
    if (!nested) break;
    parent.children = parent.children ?? [];
    parent.children.push(nested.block);
    i = nested.next;
  }
  return i;
}

function parseListBlock(
  lines: string[],
  start: number
): { block: Extract<MarkdownBlock, { type: "ul" | "ol" }>; next: number } | null {
  const first = parseListItemMarker(lines[start]);
  if (!first) {
    return null;
  }

  const kind = first.kind;
  const baseIndent = first.indent;
  const items: MarkdownListItem[] = [];
  let i = start;

  while (i < lines.length) {
    if (lines[i].trim() === "") {
      if (isBlankLineContinuation(lines, i, baseIndent, kind)) {
        i += 1;
        continue;
      }
      break;
    }

    const marker = parseListItemMarker(lines[i]);
    if (!marker || marker.indent < baseIndent) break;
    if (marker.indent > baseIndent) break;
    if (marker.kind !== kind) break;

    const item: MarkdownListItem = { content: marker.content };
    items.push(item);
    i += 1;
    i = parseNestedLists(lines, i, baseIndent, item);
  }

  return {
    block: kind === "ul" ? { type: "ul", items } : { type: "ol", items },
    next: i,
  };
}

function isMarkdownTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|");
}

function isMarkdownTableSeparator(line: string): boolean {
  return /^\|[\s:|\-]+\|$/.test(line.trim());
}

function parseTableCells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parseMarkdownTable(lines: string[]): MarkdownBlock | null {
  if (lines.length < 2) return null;
  const separatorIndex = lines.findIndex(isMarkdownTableSeparator);
  if (separatorIndex < 1) return null;

  const headers = parseTableCells(lines[0]);
  const rows = lines
    .slice(separatorIndex + 1)
    .filter(isMarkdownTableRow)
    .map(parseTableCells);

  return { type: "table", headers, rows };
}

/** Parse assistant markdown into serializable blocks (ordered lists use browser numbering). */
export function parseMarkdownDocument(text: string): MarkdownBlock[] {
  const lines = text.split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isMarkdownTableRow(line)) {
      const tableStart = i;
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        (isMarkdownTableRow(lines[i]) || isMarkdownTableSeparator(lines[i]))
      ) {
        tableLines.push(lines[i]);
        i += 1;
      }
      const table = parseMarkdownTable(tableLines);
      if (table) {
        blocks.push(table);
        continue;
      }
      i = tableStart;
    }

    if (line.startsWith("```")) {
      const fenceLang = line.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      const code = codeLines.join("\n");
      if (/^mermaid$/i.test(fenceLang)) {
        blocks.push({ type: "mermaid", code });
        continue;
      }
      if (/^(giga-visual|visual)$/i.test(fenceLang)) {
        blocks.push({ type: "visual", specJson: code });
        continue;
      }
      if (/^(giga-chart|chart)$/i.test(fenceLang)) {
        blocks.push({ type: "chart", specJson: code });
        continue;
      }
      blocks.push({ type: "code", language: fenceLang, code });
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: heading[2] });
      i += 1;
      continue;
    }

    const listMarker = parseListItemMarker(line);
    if (listMarker) {
      const list = parseListBlock(lines, i);
      if (list) {
        blocks.push(list.block);
        i = list.next;
        continue;
      }
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const paraLines: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("```") &&
      !isMarkdownTableRow(lines[i]) &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !parseListItemMarker(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paraLines.join("\n") });
  }

  return blocks;
}

/** Parse markdown without throwing — malformed assistant output falls back to a paragraph. */
export function safeParseMarkdownDocument(text: unknown): MarkdownBlock[] {
  const source = typeof text === "string" ? text : text == null ? "" : String(text);
  try {
    return parseMarkdownDocument(source);
  } catch {
    const trimmed = source.trim();
    return trimmed ? [{ type: "paragraph", text: trimmed }] : [];
  }
}

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "code"; text: string }
  | { type: "link"; children: InlineNode[]; href: string | null };

const SAFE_LINK_BASE = "https://www.giga3ai.com";

/** Allow only http(s) and mailto. javascript: and data: never become hrefs. */
export function safeMarkdownHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || /[\u0000-\u001F]/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed, SAFE_LINK_BASE);
    const protocol = url.protocol.toLowerCase();
    if (protocol === "http:" || protocol === "https:" || protocol === "mailto:") {
      return trimmed;
    }
  } catch {
    return null;
  }
  return null;
}

function findSingleAsterisk(text: string, from: number): number {
  for (let i = from; i < text.length; i += 1) {
    if (text[i] !== "*") continue;
    if (text[i + 1] === "*" || text[i - 1] === "*") continue;
    return i;
  }
  return -1;
}

function matchLink(
  text: string,
  start: number
): { label: string; href: string; end: number } | null {
  if (text[start] !== "[") return null;
  const labelEnd = text.indexOf("]", start + 1);
  if (labelEnd <= start + 1 || text[labelEnd + 1] !== "(") return null;
  let depth = 1;
  let hrefEnd = labelEnd + 2;
  for (; hrefEnd < text.length; hrefEnd += 1) {
    const char = text[hrefEnd];
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) return null;
  const label = text.slice(start + 1, labelEnd);
  const href = text.slice(labelEnd + 2, hrefEnd).trim();
  if (!label || !href) return null;
  return { label, href, end: hrefEnd + 1 };
}

function parseInline(text: string, depth: number): InlineNode[] {
  if (!text) return [];
  if (depth > 6) return [{ type: "text", text }];

  const nodes: InlineNode[] = [];
  let buffer = "";
  const flush = () => {
    if (!buffer) return;
    nodes.push({ type: "text", text: buffer });
    buffer = "";
  };

  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        nodes.push({ type: "code", text: text.slice(i + 1, end) });
        i = end;
        continue;
      }
    }

    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        nodes.push({
          type: "strong",
          children: parseInline(text.slice(i + 2, end), depth + 1),
        });
        i = end + 1;
        continue;
      }
    }

    if (text[i] === "*" && text[i + 1] !== "*") {
      const end = findSingleAsterisk(text, i + 1);
      if (end > i + 1) {
        flush();
        nodes.push({
          type: "em",
          children: parseInline(text.slice(i + 1, end), depth + 1),
        });
        i = end;
        continue;
      }
    }

    if (text[i] === "[") {
      const link = matchLink(text, i);
      if (link) {
        flush();
        nodes.push({
          type: "link",
          children: parseInline(link.label, depth + 1),
          href: safeMarkdownHref(link.href),
        });
        i = link.end - 1;
        continue;
      }
    }

    buffer += text[i];
  }

  flush();
  return nodes;
}

/** Inline markdown. Unclosed markers stay as text so streaming replies cannot throw. */
export function parseInlineMarkdown(text: string): InlineNode[] {
  try {
    const nodes = parseInline(typeof text === "string" ? text : "", 0);
    return nodes.length > 0 ? nodes : [{ type: "text", text: text ?? "" }];
  } catch {
    return [{ type: "text", text: typeof text === "string" ? text : "" }];
  }
}
