/** Structured chat reply logs for Convex actions (stdout → dashboard logs). */

export function logChatReply(
  event: string,
  fields: Record<string, string | number | boolean | null | undefined>
): void {
  console.log(
    JSON.stringify({
      service: "giga3-chat-reply",
      event,
      ts: Date.now(),
      ...fields,
    })
  );
}
