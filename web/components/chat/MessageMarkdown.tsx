"use client";

import { CodeBlock } from "@/components/chat/CodeBlock";
import { cn } from "@/lib/utils";
import {
  safeParseMarkdownDocument,
  type MarkdownBlock,
  type MarkdownListItem,
} from "@/lib/chat/messageMarkdownParser";
import dynamic from "next/dynamic";
import { memo, useMemo, type ReactNode } from "react";

const MermaidDiagram = dynamic(
  () => import("@/components/chat/MermaidDiagram").then((m) => m.MermaidDiagram),
  { ssr: false, loading: () => <p className="text-sm text-muted">Loading diagram…</p> }
);

const ChartVisualBlock = dynamic(
  () => import("@/components/chat/ChartVisualBlock").then((m) => m.ChartVisualBlock),
  { ssr: false, loading: () => <p className="text-sm text-muted">Loading chart…</p> }
);

const VisualContentBlock = dynamic(
  () => import("@/components/chat/VisualContentBlock").then((m) => m.VisualContentBlock),
  { ssr: false, loading: () => <p className="text-sm text-muted">Loading visual…</p> }
);

interface MessageMarkdownProps {
  content: string;
  className?: string;
}

/** Lightweight markdown for assistant replies — no external deps, memoized blocks. */
export const MessageMarkdown = memo(function MessageMarkdown({
  content,
  className,
}: MessageMarkdownProps) {
  const blocks = useMemo(
    () => renderMarkdownBlocks(safeParseMarkdownDocument(content)),
    [content]
  );
  return <div className={cn("chat-markdown", className)}>{blocks}</div>;
});

function renderMarkdownBlocks(blocks: MarkdownBlock[]): ReactNode[] {
  return blocks.map((block, index) => renderMarkdownBlock(block, index));
}

function renderMarkdownBlock(block: MarkdownBlock, key: number): ReactNode {
  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level}` as "h1" | "h2" | "h3";
      return (
        <Tag key={key} className={`chat-md-h${block.level}`}>
          {renderInline(block.text)}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p key={key} className="chat-md-p">
          {renderInline(block.text)}
        </p>
      );
    case "code":
      return (
        <CodeBlock
          key={key}
          code={block.code}
          language={block.language || undefined}
        />
      );
    case "mermaid":
      return <MermaidDiagram key={key} code={block.code} />;
    case "visual":
      return <VisualContentBlock key={key} specJson={block.specJson} />;
    case "chart":
      return <ChartVisualBlock key={key} specJson={block.specJson} />;
    case "ul":
      return (
        <ul key={key} className="chat-md-ul">
          {renderListItems(block.items)}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="chat-md-ol">
          {renderListItems(block.items)}
        </ol>
      );
    case "table":
      return (
        <div key={key} className="chat-md-table-wrap" role="region" aria-label="Data table">
          <table className="chat-md-table">
            <thead>
              <tr>
                {(block.headers ?? []).map((cell, cellIndex) => (
                  <th key={`th-${cellIndex}`}>{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(block.rows ?? []).map((row, rowIndex) => (
                <tr key={`tr-${rowIndex}`}>
                  {(row ?? []).map((cell, cellIndex) => (
                    <td key={`td-${rowIndex}-${cellIndex}`}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

function renderListItems(items: MarkdownListItem[] | undefined): ReactNode[] {
  return (items ?? []).map((item, index) => (
    <li key={index}>
      {renderInline(item.content)}
      {item.children?.length ? (
        <div className="chat-md-nested">{renderMarkdownBlocks(item.children)}</div>
      ) : null}
    </li>
  ));
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
