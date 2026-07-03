/**
 * Structured client-side chat logs — enable with ?chatLog=1 or
 * localStorage.giga3_chat_log = "1". Never logs message content.
 */

export type ChatLogEvent =
  | "send_start"
  | "send_ack"
  | "send_fail"
  | "send_offline_queued"
  | "reply_detected"
  | "reply_timeout"
  | "reply_status_inactive"
  | "poll_ok"
  | "poll_fail"
  | "regenerate_start"
  | "edit_start"
  | "cancel_start"
  | "outbox_flush"
  | "session_bootstrap_fail";

function chatLogEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("giga3_chat_log") === "1") return true;
    return new URLSearchParams(window.location.search).get("chatLog") === "1";
  } catch {
    return false;
  }
}

export function logChatClient(
  event: ChatLogEvent,
  fields: Record<string, string | number | boolean | null | undefined> = {}
): void {
  if (!chatLogEnabled()) return;
  console.log(
    JSON.stringify({
      service: "giga3-chat-client",
      event,
      ts: Date.now(),
      ...fields,
    })
  );
}
