import type { UiMessage } from "@/components/chat/MessageList";

const DEFAULT_SHARE_ORIGIN = "https://www.giga3ai.com";

export const SHARE_TEXT_LIMIT = 12_000;
export const COPY_SUCCESS = "Copied Successfully";
export const SHARE_SUCCESS = "Shared Successfully";
export const EXPORT_SUCCESS = "Export Started";

export function roleLabel(
  role: "user" | "assistant" | UiMessage["role"]
): string {
  return role === "user" ? "You" : "Giga3 AI";
}

export function normalizeMessageContent(content: string): string {
  return typeof content === "string" ? content.trim() : "";
}

export function messageHasCopyableContent(content: string): boolean {
  const normalized = normalizeMessageContent(content);
  return normalized.length > 0;
}

/** Preserves raw markdown — code blocks, lists, tables, and media URLs. */
export function formatMessageForCopy(
  role: "user" | "assistant",
  content: string,
  options?: { includeRoleHeader?: boolean }
): string {
  const normalized = normalizeMessageContent(content);
  if (!normalized) return "";
  if (options?.includeRoleHeader === false) return normalized;
  return `### ${roleLabel(role)}\n\n${normalized}`;
}

export function formatMessageForShare(
  role: "user" | "assistant",
  content: string
): { title: string; text: string } {
  const text = formatMessageForCopy(role, content);
  return {
    title: role === "user" ? "My message — Giga3 AI" : "Giga3 AI reply",
    text: truncateText(text, SHARE_TEXT_LIMIT),
  };
}

export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 24).trimEnd()}\n\n… (truncated)`;
}

export interface ConversationMeta {
  title?: string;
  email?: string;
  shareUrl?: string;
}

export function formatConversationMarkdown(
  messages: UiMessage[],
  meta?: ConversationMeta
): string {
  const exportable = messages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );
  if (exportable.length === 0) return "";

  const lines: string[] = ["# Giga3 AI — Chat export", ""];
  if (meta?.title) lines.push(`**Conversation:** ${meta.title}`, "");
  if (meta?.email) lines.push(`**User:** ${meta.email}`, "");
  lines.push(`**Exported:** ${new Date().toISOString()}`, "");
  if (meta?.shareUrl) lines.push(`**Share link:** ${meta.shareUrl}`, "");
  lines.push("---", "");

  for (const m of exportable) {
    lines.push(formatMessageForCopy(m.role, m.content));
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export function formatConversationForShare(
  messages: UiMessage[],
  meta?: ConversationMeta
): { title: string; text: string; url?: string } {
  const md = formatConversationMarkdown(messages, meta);
  const title = meta?.title?.trim() || "Giga3 AI chat";
  return {
    title,
    text: truncateText(md, SHARE_TEXT_LIMIT),
    url: meta?.shareUrl,
  };
}

export function conversationExportFilename(
  title: string | undefined,
  ext: string
): string {
  const slug = (title || "chat")
    .replace(/[^\w-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `giga3-${slug || "chat"}.${ext}`;
}

export function buildPublicShareUrl(token: string, origin?: string): string {
  const base = (
    origin?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : DEFAULT_SHARE_ORIGIN)
  ).replace(/\/$/, "");
  return `${base}/chat/share/?t=${encodeURIComponent(token)}`;
}

/** Lightweight markdown → HTML for rich clipboard paste. */
export function markdownToSimpleHtml(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const parts: string[] = [];
  const fenceRe = /```([\w-]*)\n([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRe.exec(escaped)) !== null) {
    if (match.index > last) {
      parts.push(wrapInlineMarkdown(escaped.slice(last, match.index)));
    }
    const lang = match[1];
    const code = match[2];
    parts.push(
      `<pre style="background:#f4f4f5;padding:12px;border-radius:8px;overflow:auto"><code${
        lang ? ` data-lang="${lang}"` : ""
      }>${code}</code></pre>`
    );
    last = fenceRe.lastIndex;
  }
  if (last < escaped.length) {
    parts.push(wrapInlineMarkdown(escaped.slice(last)));
  }

  return `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#111">${parts.join("")}</div>`;
}

function wrapInlineMarkdown(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        return `<h${level} style="margin:0.75em 0 0.35em">${heading[2]}</h${level}>`;
      }
      if (/^[-*]\s+/m.test(trimmed)) {
        const items = trimmed
          .split("\n")
          .filter((l) => /^[-*]\s+/.test(l))
          .map((l) => `<li>${inlineHtml(l.replace(/^[-*]\s+/, ""))}</li>`)
          .join("");
        return `<ul style="margin:0.5em 0;padding-left:1.25em">${items}</ul>`;
      }
      if (/^\d+\.\s+/m.test(trimmed)) {
        const items = trimmed
          .split("\n")
          .filter((l) => /^\d+\.\s+/.test(l))
          .map((l) => `<li>${inlineHtml(l.replace(/^\d+\.\s+/, ""))}</li>`)
          .join("");
        return `<ol style="margin:0.5em 0;padding-left:1.25em">${items}</ol>`;
      }
      if (trimmed.includes("|") && trimmed.includes("---")) {
        return `<pre style="white-space:pre-wrap">${trimmed}</pre>`;
      }
      return `<p style="margin:0.5em 0;white-space:pre-wrap">${inlineHtml(trimmed)}</p>`;
    })
    .filter(Boolean)
    .join("");
}

function inlineHtml(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code style=\"background:#f4f4f5;padding:0 4px;border-radius:4px\">$1</code>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" style="color:#5b21b6">$1</a>'
    );
}
