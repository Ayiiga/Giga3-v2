/**
 * URL validation and SSRF protection for live web fetch/search.
 * Blocks private networks, localhost, link-local, and metadata endpoints.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "metadata.goog",
]);

const BLOCKED_SUFFIXES = [
  ".local",
  ".internal",
  ".localhost",
  ".corp",
  ".lan",
];

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 link-local
  [0x00000000, 0x00ffffff], // 0.0.0.0/8
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    value = (value << 8) + n;
  }
  return value >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return false;
  return PRIVATE_IPV4_RANGES.some(([start, end]) => value >= start && value <= end);
}

function isPrivateIpv6(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "::1" || lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) {
    return true;
  }
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice("::ffff:".length);
    return isPrivateIpv4(mapped);
  }
  return false;
}

function hostnameBlocked(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return "Missing hostname";
  if (BLOCKED_HOSTNAMES.has(host)) return "Blocked hostname";
  for (const suffix of BLOCKED_SUFFIXES) {
    if (host.endsWith(suffix)) return "Blocked internal domain";
  }
  if (host.endsWith(".google.internal") || host.endsWith(".metadata")) {
    return "Blocked metadata endpoint";
  }
  if (isPrivateIpv4(host) || isPrivateIpv6(host)) {
    return "Blocked private IP address";
  }
  return null;
}

export type UrlValidationResult =
  | { ok: true; url: URL; domain: string }
  | { ok: false; reason: string };

export function validatePublicHttpUrl(raw: string): UrlValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "Empty URL" };
  if (trimmed.length > 2048) return { ok: false, reason: "URL too long" };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Only http(s) URLs are allowed" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: "URLs with credentials are not allowed" };
  }

  const blocked = hostnameBlocked(parsed.hostname);
  if (blocked) return { ok: false, reason: blocked };

  const domain = parsed.hostname.replace(/^www\./i, "");
  return { ok: true, url: parsed, domain };
}

export function extractUrlsFromText(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? [];
  const unique = new Set<string>();
  for (const match of matches) {
    const cleaned = match.replace(/[.,;:!?)]+$/, "");
    const validated = validatePublicHttpUrl(cleaned);
    if (validated.ok) unique.add(validated.url.toString());
  }
  return [...unique];
}

export function domainFromUrl(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./i, "");
  } catch {
    return uri;
  }
}

/** Strip credential-like patterns from text before sending to the model. */
export function redactSensitivePatterns(text: string): string {
  return text
    .replace(/\b(sk|pk)_(live|test)_[A-Za-z0-9]{8,}\b/g, "[REDACTED_KEY]")
    .replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi, "Bearer [REDACTED]")
    .replace(/\b(api[_-]?key|token|password|secret)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
}
