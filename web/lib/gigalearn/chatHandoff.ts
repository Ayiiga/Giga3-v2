import type { PreparedChatAttachment } from "@/lib/chat/multimodalAttachments";

const HANDOFF_KEY = "giga3_gigalearn_handoff";

export interface GigaLearnChatHandoff {
  prompt: string;
  attachment?: PreparedChatAttachment;
  curriculum?: string;
  subject?: string;
  level?: string;
}

export function storeGigaLearnChatHandoff(handoff: GigaLearnChatHandoff): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
  } catch {
    /* quota */
  }
}

export function consumeGigaLearnChatHandoff(): GigaLearnChatHandoff | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(HANDOFF_KEY);
    return JSON.parse(raw) as GigaLearnChatHandoff;
  } catch {
    sessionStorage.removeItem(HANDOFF_KEY);
    return null;
  }
}

export function buildHomeworkChatPrompt(args: {
  curriculum?: string;
  subject?: string;
  level?: string;
  notes?: string;
}): string {
  const lines = [
    "Please analyze this homework image and help me solve it step by step.",
    "Show your reasoning, any formulas used, and give the final answer clearly.",
    "Explain in student-friendly language suitable for my level.",
  ];
  if (args.curriculum) lines.push(`Curriculum: ${args.curriculum.replace(/-/g, " ")}.`);
  if (args.subject) lines.push(`Subject: ${args.subject.replace(/-/g, " ")}.`);
  if (args.level) lines.push(`Level: ${args.level.replace(/-/g, " ")}.`);
  if (args.notes?.trim()) lines.push(`Additional notes: ${args.notes.trim()}`);
  return lines.join("\n");
}
