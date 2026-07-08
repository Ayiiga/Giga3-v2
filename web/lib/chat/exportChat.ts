import type { UiMessage } from "@/components/chat/MessageList";
import {
  conversationExportFilename,
  formatConversationMarkdown,
  roleLabel,
} from "@/lib/chat/chatContentFormat";
import { GIGA3_ATTRIBUTION_LINE } from "@/lib/share/giga3Attribution";

export {
  conversationExportFilename,
  formatConversationMarkdown,
} from "@/lib/chat/chatContentFormat";

/** @deprecated Use formatConversationMarkdown */
export function formatChatAsPlainText(
  messages: UiMessage[],
  meta?: { title?: string; email?: string; shareUrl?: string }
): string {
  return formatConversationMarkdown(messages, meta);
}

export function downloadTextFile(filename: string, text: string): void {
  if (!text.trim()) return;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  triggerDownloadBlob(blob, filename);
}

export function downloadMarkdownFile(filename: string, markdown: string): void {
  if (!markdown.trim()) return;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  triggerDownloadBlob(blob, filename);
}

function triggerDownloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadDocxFile(filename: string, markdown: string): void {
  if (!markdown.trim()) return;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5">
<h1>Giga3 AI Chat Export</h1>
<pre style="white-space:pre-wrap;font-family:Calibri,Arial,sans-serif">${escapeHtml(markdown)}</pre>
</body></html>`;
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });
  triggerDownloadBlob(blob, filename.endsWith(".doc") ? filename : `${filename}.doc`);
}

export function openChatPrintView(
  messages: UiMessage[],
  meta?: { title?: string }
): void {
  const exportable = messages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );
  if (exportable.length === 0) {
    throw new Error("No messages to export");
  }

  const body = exportable
    .map(
      (m) =>
        `<section style="margin-bottom:1.25rem"><h3 style="margin:0 0 0.35rem;font-size:14px;color:#5b21b6">${roleLabel(
          m.role
        )}</h3><pre style="margin:0;white-space:pre-wrap;font-family:system-ui,sans-serif;font-size:13px;line-height:1.5">${escapeHtml(
          m.content
        )}</pre></section>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Giga3 AI Chat</title></head><body style="font-family:system-ui,sans-serif;padding:24px;max-width:720px;margin:0 auto;color:#111">
<h1 style="font-size:20px;margin:0 0 8px">Giga3 AI — Chat</h1>
${meta?.title ? `<p style="margin:0 0 16px;color:#52525b">${escapeHtml(meta.title)}</p>` : ""}
${body}
<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a">${escapeHtml(GIGA3_ATTRIBUTION_LINE)}</p>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    throw new Error(
      "Pop-up blocked. Allow pop-ups to export PDF, or use Export chat (Markdown)."
    );
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inline markdown (bold/italic/code/links) on already-escaped text. */
function inlineMarkdownToHtml(escaped: string): string {
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" style="color:#5b21b6">$1</a>'
    );
}

/** Lightweight markdown → printable HTML for document exports (headings, lists, tables, code). */
export function markdownToPrintableHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(
        `<pre style="background:#f4f4f5;padding:12px;border-radius:8px;overflow-x:auto;font-size:12px"><code>${escapeHtml(
          code.join("\n")
        )}</code></pre>`
      );
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const size = level === 1 ? 22 : level === 2 ? 18 : 15;
      out.push(
        `<h${level} style="font-size:${size}px;margin:18px 0 8px;font-weight:700">${inlineMarkdownToHtml(
          escapeHtml(heading[2])
        )}</h${level}>`
      );
      i += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inlineMarkdownToHtml(escapeHtml(lines[i].replace(/^[-*]\s+/, "")))}</li>`);
        i += 1;
      }
      out.push(`<ul style="margin:8px 0 8px 20px">${items.join("")}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inlineMarkdownToHtml(escapeHtml(lines[i].replace(/^\d+\.\s+/, "")))}</li>`);
        i += 1;
      }
      out.push(`<ol style="margin:8px 0 8px 20px">${items.join("")}</ol>`);
      continue;
    }
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    out.push(
      `<p style="margin:8px 0;line-height:1.6">${inlineMarkdownToHtml(escapeHtml(para.join("\n"))).replace(/\n/g, "<br>")}</p>`
    );
  }
  return out.join("\n");
}

/** Open a formatted, printable document view of a single message (Save as PDF). */
export function openMessagePrintView(
  content: string,
  meta?: { title?: string }
): void {
  const clean = content.trim();
  if (!clean) throw new Error("No content to export");
  const title = meta?.title?.trim() || "Giga3 AI — Document";
  const bodyHtml = markdownToPrintableHtml(clean);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(
    title
  )}</title></head><body style="font-family:Georgia,'Times New Roman',serif;color:#18181b;max-width:720px;margin:0 auto;padding:40px 32px;font-size:15px">
<div style="border-bottom:2px solid #5b21b6;padding-bottom:10px;margin-bottom:20px">
  <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5b21b6;font-family:system-ui,sans-serif">Giga3 AI</div>
  <div style="font-size:20px;font-weight:700;margin-top:4px">${escapeHtml(title)}</div>
</div>
${bodyHtml}
<script>window.onload=function(){setTimeout(function(){window.print();},400);}</script>
</body></html>`;
  // Note: no "noopener" — that makes window.open() return null so we cannot
  // write the document into the new tab (it would stay blank).
  const w = window.open("", "_blank");
  if (!w) {
    throw new Error(
      "Pop-up blocked. Allow pop-ups to download the PDF, or copy the message."
    );
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
