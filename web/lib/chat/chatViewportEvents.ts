/** Custom event to request a mobile chat viewport/composer sync without tight coupling. */
export const CHAT_VIEWPORT_SYNC_EVENT = "chat:viewport-sync";

export type ChatViewportSyncDetail = {
  reason?: "focus" | "blur" | "typing-mode" | "scroll" | "resize" | "orientation";
};

export function dispatchChatViewportSync(detail?: ChatViewportSyncDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_VIEWPORT_SYNC_EVENT, { detail }));
}
