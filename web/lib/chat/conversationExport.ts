import type { UiMessage } from "@/components/chat/MessageList";
import { downloadTextFile } from "@/lib/download";

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^\w.-]+/g, "_").slice(0, 48) || "chat";
}

export function formatConversationPlain(messages: UiMessage[]): string {
  return messages
    .map((m) => {
      const role = m.role === "user" ? "You" : "Giga3 AI";
      return `${role}:\n${m.content}\n`;
    })
    .join("\n---\n\n");
}

export function formatConversationMarkdown(messages: UiMessage[]): string {
  const lines = ["# Giga3 AI Chat Export", ""];
  for (const m of messages) {
    const heading = m.role === "user" ? "## You" : "## Giga3 AI";
    lines.push(heading, "", m.content, "");
  }
  return lines.join("\n");
}

export function downloadConversationTxt(messages: UiMessage[], label?: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `giga3-chat-${sanitizeFilenamePart(label ?? stamp)}.txt`;
  downloadTextFile(name, formatConversationPlain(messages));
}

export function downloadConversationMarkdown(messages: UiMessage[], label?: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `giga3-chat-${sanitizeFilenamePart(label ?? stamp)}.md`;
  downloadTextFile(name, formatConversationMarkdown(messages), "text/markdown;charset=utf-8");
}

/** Opens a print-friendly view so the user can save as PDF from the browser. */
export function exportConversationPdf(messages: UiMessage[], title = "Giga3 AI Chat") {
  const body = formatConversationPlain(messages)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    throw new Error("Pop-up blocked. Allow pop-ups to export PDF.");
  }
  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; color: #111; line-height: 1.5; }
  h1 { font-size: 1.25rem; margin-bottom: 1rem; }
  pre { white-space: pre-wrap; word-break: break-word; font-size: 11pt; }
</style></head><body>
<h1>${title}</h1>
<pre>${body}</pre>
<script>window.onload = function(){ window.print(); };</script>
</body></html>`);
  win.document.close();
}
