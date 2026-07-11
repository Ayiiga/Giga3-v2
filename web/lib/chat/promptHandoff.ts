const HANDOFF_KEY = "giga3_prompt_handoff";

export interface PromptChatHandoff {
  prompt: string;
  title?: string;
  sourceId?: string;
}

export function storePromptChatHandoff(handoff: PromptChatHandoff): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
  } catch {
    /* ignore */
  }
}

export function consumePromptChatHandoff(): PromptChatHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(HANDOFF_KEY);
    return JSON.parse(raw) as PromptChatHandoff;
  } catch {
    return null;
  }
}
