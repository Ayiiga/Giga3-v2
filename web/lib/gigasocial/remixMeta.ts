/** Remix metadata encoded in post body — no schema migration required. */

const REMIX_MARKER = /\[giga-remix:([a-z0-9]+)\]\s*$/i;

export type RemixMeta = {
  sourcePostId: string;
  sourceAuthorHandle?: string;
  sourceAuthorName?: string;
};

export function buildRemixBodyPrefix(meta: RemixMeta): string {
  const handle = meta.sourceAuthorHandle ? `@${meta.sourceAuthorHandle}` : meta.sourceAuthorName ?? "creator";
  return `🎬 Remixing ${handle}\n\n`;
}

export function appendRemixMarker(body: string, sourcePostId: string): string {
  const trimmed = body.replace(REMIX_MARKER, "").trimEnd();
  return `${trimmed}\n[giga-remix:${sourcePostId}]`;
}

export function parseRemixMeta(body: string): RemixMeta | null {
  const match = body.match(REMIX_MARKER);
  if (!match?.[1]) return null;
  return { sourcePostId: match[1] };
}

export function stripRemixMarker(body: string): string {
  return body.replace(REMIX_MARKER, "").trimEnd();
}
