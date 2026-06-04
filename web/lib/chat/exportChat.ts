import type { UiMessage } from "@/components/chat/MessageList";

function roleLabel(role: UiMessage["role"]): string {
  return role === "user" ? "You" : "Giga3 AI";
}

export function formatChatAsPlainText(
  messages: UiMessage[],
  meta?: { title?: string; email?: string }
): string {
  const lines: string[] = [];
  lines.push("Giga3 AI — Chat export");
  if (meta?.title) lines.push(`Conversation: ${meta.title}`);
  if (meta?.email) lines.push(`User: ${meta.email}`);
  lines.push(`Exported: ${new Date().toISOString()}`);
  lines.push("");
  for (const m of messages) {
    lines.push(`--- ${roleLabel(m.role)} ---`);
    lines.push(m.content);
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
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

export function openChatPrintView(
  messages: UiMessage[],
  meta?: { title?: string }
): void {
  const body = messages
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
<script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    throw new Error("Pop-up blocked. Allow pop-ups to export PDF, or use Export TXT.");
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
