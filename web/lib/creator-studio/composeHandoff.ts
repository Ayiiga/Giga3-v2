/** Creator Studio → GigaSocial text compose handoff (sessionStorage). */

const STORAGE_KEY = "giga3_creator_compose_handoff_v1";

export type CreatorComposeHandoffKind = "blog" | "social";

export type CreatorComposeHandoff = {
  body: string;
  kind: CreatorComposeHandoffKind;
};

export function stageCreatorComposeHandoff(
  body: string,
  kind: CreatorComposeHandoffKind = "social"
): void {
  if (typeof sessionStorage === "undefined") return;
  const trimmed = body.trim();
  if (!trimmed) return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ body: trimmed, at: Date.now(), kind })
  );
}

export function consumeCreatorComposeHandoff(): CreatorComposeHandoff | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as { body?: string; kind?: CreatorComposeHandoffKind };
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    if (!body) return null;
    return { body, kind: parsed.kind === "blog" ? "blog" : "social" };
  } catch {
    return null;
  }
}
