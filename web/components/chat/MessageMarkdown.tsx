"use client";

import { cn } from "@/lib/utils";
import { MermaidDiagram } from "@/components/chat/MermaidDiagram";
import { memo, useMemo, type ReactNode } from "react";

interface MessageMarkdownProps {
  content: string;
  className?: string;
}

/** Lightweight markdown for assistant replies — no external deps, memoized blocks. */
export const MessageMarkdown = memo(function MessageMarkdown({
  content,
  className,
}: MessageMarkdownProps) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);
  return <div className={cn("chat-markdown", className)}>{blocks}</div>;
});

function parseMarkdownBlocks(text: string): ReactNode[] {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

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
      const tableNode = renderMarkdownTable(tableLines, blockKey++);
      if (tableNode) {
        nodes.push(tableNode);
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
      if (/^mermaid$/i.test(fenceLang)) {
        nodes.push(
          <MermaidDiagram key={`diagram-${blockKey++}`} code={codeLines.join("\n")} />
        );
        continue;
      }
      nodes.push(
        <pre key={`code-${blockKey++}`} className="chat-md-pre">
          {fenceLang && (
            <span className="chat-md-code-lang" aria-hidden>
              {fenceLang}
            </span>
          )}
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const Tag = (`h${level}` as "h1" | "h2" | "h3");
      nodes.push(
        <Tag key={`h-${blockKey++}`} className={`chat-md-h${level}`}>
          {renderInline(heading[2])}
        </Tag>
      );
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(
          <li key={`li-${blockKey}-${items.length}`}>
            {renderInline(lines[i].replace(/^[-*]\s+/, ""))}
          </li>
        );
        i += 1;
      }
      nodes.push(
        <ul key={`ul-${blockKey++}`} className="chat-md-ul">
          {items}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(
          <li key={`oli-${blockKey}-${items.length}`}>
            {renderInline(lines[i].replace(/^\d+\.\s+/, ""))}
          </li>
        );
        i += 1;
      }
      nodes.push(
        <ol key={`ol-${blockKey++}`} className="chat-md-ol">
          {items}
        </ol>
      );
      continue;
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
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    nodes.push(
      <p key={`p-${blockKey++}`} className="chat-md-p">
        {renderInline(paraLines.join("\n"))}
      </p>
    );
  }

  return nodes;
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

function renderMarkdownTable(lines: string[], key: number): ReactNode | null {
  if (lines.length < 2) return null;
  const separatorIndex = lines.findIndex(isMarkdownTableSeparator);
  if (separatorIndex < 1) return null;

  const headerCells = parseTableCells(lines[0]);
  const bodyRows = lines
    .slice(separatorIndex + 1)
    .filter(isMarkdownTableRow)
    .map(parseTableCells);

  return (
    <div key={`table-${key}`} className="chat-md-table-wrap">
      <table className="chat-md-table">
        <thead>
          <tr>
            {headerCells.map((cell, cellIndex) => (
              <th key={`th-${cellIndex}`}>{renderInline(cell)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr key={`tr-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`td-${rowIndex}-${cellIndex}`}>{renderInline(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`b-${key++}`} className="chat-md-strong">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <em key={`i-${key++}`} className="chat-md-em">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code key={`c-${key++}`} className="chat-md-code">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const href = safeHref(linkMatch[2]);
        if (!href) {
          parts.push(linkMatch[1]);
          lastIndex = pattern.lastIndex;
          continue;
        }
        parts.push(
          <a
            key={`a-${key++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-md-link"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw, "https://www.giga3ai.com");
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return raw;
    }
  } catch {
    return null;
  }
  return null;
}
