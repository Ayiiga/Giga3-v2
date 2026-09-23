"use client";

import { CodeBlock } from "@/components/chat/CodeBlock";
import { cn } from "@/lib/utils";
import {
  parseInlineMarkdown,
  safeParseMarkdownDocument,
  type InlineNode,
  type MarkdownBlock,
  type MarkdownListItem,
} from "@/lib/chat/messageMarkdownParser";
import { isInternalGiga3Href } from "@/lib/chat/productRedirects";
import dynamic from "next/dynamic";
import { Fragment, memo, useMemo, type ReactNode } from "react";

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
  /**
   * Lowest heading rank to emit (1–3). Smart Answer bodies use 3 so inner
   * headings stay under the section title.
   */
  headingFloor?: 1 | 2 | 3;
}

/** Lightweight markdown for assistant replies — no external deps, memoized blocks. */
export const MessageMarkdown = memo(function MessageMarkdown({
  content,
  className,
  headingFloor = 1,
}: MessageMarkdownProps) {
  const blocks = useMemo(
    () => renderMarkdownBlocks(safeParseMarkdownDocument(content), headingFloor),
    [content, headingFloor]
  );
  return <div className={cn("chat-markdown", className)}>{blocks}</div>;
});

function renderMarkdownBlocks(blocks: MarkdownBlock[], headingFloor: 1 | 2 | 3): ReactNode[] {
  return blocks.map((block, index) => renderMarkdownBlock(block, index, headingFloor));
}

function renderMarkdownBlock(
  block: MarkdownBlock,
  key: number,
  headingFloor: 1 | 2 | 3
): ReactNode {
  switch (block.type) {
    case "heading": {
      const level = Math.min(3, Math.max(block.level, headingFloor)) as 1 | 2 | 3;
      const Tag = `h${level}` as "h1" | "h2" | "h3";
      return (
        <Tag key={key} className={`chat-md-h${level}`}>
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
          {renderListItems(block.items, headingFloor)}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="chat-md-ol">
          {renderListItems(block.items, headingFloor)}
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

function renderListItems(
  items: MarkdownListItem[] | undefined,
  headingFloor: 1 | 2 | 3
): ReactNode[] {
  return (items ?? []).map((item, index) => (
    <li key={index}>
      {renderInline(item.content)}
      {item.children?.length ? (
        <div className="chat-md-nested">{renderMarkdownBlocks(item.children, headingFloor)}</div>
      ) : null}
    </li>
  ));
}

function renderInline(text: string): ReactNode[] {
  return renderInlineNodes(parseInlineMarkdown(text));
}

function renderInlineNodes(nodes: InlineNode[]): ReactNode[] {
  return nodes.map((node, index) => renderInlineNode(node, index));
}

function renderInlineNode(node: InlineNode, key: number): ReactNode {
  switch (node.type) {
    case "text":
      return <Fragment key={`t-${key}`}>{node.text}</Fragment>;
    case "strong":
      return (
        <strong key={`b-${key}`} className="chat-md-strong">
          {renderInlineNodes(node.children)}
        </strong>
      );
    case "em":
      return (
        <em key={`i-${key}`} className="chat-md-em">
          {renderInlineNodes(node.children)}
        </em>
      );
    case "code":
      return (
        <code key={`c-${key}`} className="chat-md-code">
          {node.text}
        </code>
      );
    case "link": {
      if (!node.href) {
        return <Fragment key={`l-${key}`}>{renderInlineNodes(node.children)}</Fragment>;
      }
      const internal = isInternalGiga3Href(node.href);
      return (
        <a
          key={`a-${key}`}
          href={node.href}
          target={internal ? undefined : "_blank"}
          rel={internal ? undefined : "noopener noreferrer"}
          className="chat-md-link"
        >
          {renderInlineNodes(node.children)}
        </a>
      );
    }
    default:
      return null;
  }
}
