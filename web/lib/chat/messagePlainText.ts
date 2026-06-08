import { parseMessageMedia } from "@/lib/chat/parseMessageMedia";

function roleLabel(role: "user" | "assistant"): string {
  return role === "user" ? "You" : "Giga3 AI";
}

/** Plain text for copy/share — includes media URLs when present. */
export function messagePlainText(
  role: "user" | "assistant",
  content: string,
  options?: { includeRoleLabel?: boolean }
): string {
  const parsed = parseMessageMedia(content);
  const parts: string[] = [];

  if (parsed.text.length > 0) {
    parts.push(parsed.text);
  } else if (parsed.images.length === 0 && parsed.videos.length === 0) {
    parts.push(content.trim());
  }

  for (const url of parsed.images) parts.push(url);
  for (const url of parsed.videos) parts.push(url);

  const body = parts.join("\n\n").trim();
  if (!body) return "";

  if (options?.includeRoleLabel === false) return body;
  return `${roleLabel(role)}:\n${body}`;
}
