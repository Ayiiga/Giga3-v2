/**
 * Shared rules for public webpage fetches.
 * Hostname checks are not enough: callers must also validate resolved addresses.
 */

export const BROWSE_TIMEOUT_MS = 12_000;
export const BROWSE_MAX_BYTES = 512_000;
export const BROWSE_MAX_TEXT_CHARS = 15_000;
export const BROWSE_MAX_REDIRECTS = 3;
export const BROWSE_MAX_BATCH = 10;
export const BROWSE_BATCH_BUDGET_MS = 20_000;

export const BROWSE_USER_AGENT = "Giga3Browse/1.0 (+https://www.giga3ai.com)";

export type BrowseErrorCode =
  | "invalid_url"
  | "unsupported_protocol"
  | "blocked_destination"
  | "blocked_redirect"
  | "timeout"
  | "response_too_large"
  | "unavailable"
  | "too_many_urls";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "metadata.goog",
]);

const PRIVATE_IPV4: Array<[number, number]> = [
  [0x00000000, 0x00ffffff], // 0.0.0.0/8
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
];

/** Public Giga3 pages a controlled self-audit may open. Not an auth bypass. */
export const PUBLIC_AUDIT_PATHS = [
  "/",
  "/chat/",
  "/gigalearn/",
  "/media/",
  "/gigaedit/",
  "/gigasocial/",
  "/marketplace/",
  "/install/",
  "/offline/",
  "/robots.txt",
  "/sitemap.xml",
] as const;

const GIGA_PRIVATE_PREFIXES = [
  "/admin",
  "/api",
  "/wallet",
  "/credits",
  "/payment",
  "/workspace",
  "/settings",
  "/profile",
  "/subscribe",
  "/mutation",
  "/query",
  "/action",
  "/marketplace/sell",
  "/marketplace/purchases",
];

export function browseErrorMessage(code: BrowseErrorCode): string {
  switch (code) {
    case "invalid_url":
      return "That address is not a valid URL.";
    case "unsupported_protocol":
      return "Only http and https addresses can be browsed.";
    case "blocked_destination":
      return "That address cannot be browsed.";
    case "blocked_redirect":
      return "The page redirected to an address that cannot be browsed.";
    case "timeout":
      return "The website took too long to respond.";
    case "response_too_large":
      return "The page is too large to browse.";
    case "too_many_urls":
      return "Browse up to 10 addresses at a time.";
    default:
      return "That website is unavailable.";
  }
}

export class BrowseError extends Error {
  readonly code: BrowseErrorCode;

  constructor(code: BrowseErrorCode) {
    super(browseErrorMessage(code));
    this.name = "BrowseError";
    this.code = code;
  }
}

export function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    value = (value << 8) + n;
  }
  return value >>> 0;
}

export function isBlockedIpAddress(address: string): boolean {
  const raw = address.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!raw) return true;
  if (raw === "::1" || raw === "::" || raw === "0.0.0.0") return true;
  if (raw.startsWith("fe80:") || raw.startsWith("fc") || raw.startsWith("fd")) return true;
  if (raw.startsWith("::ffff:")) {
    return isBlockedIpAddress(raw.slice("::ffff:".length));
  }
  const v4 = ipv4ToInt(raw);
  if (v4 !== null) {
    return PRIVATE_IPV4.some(([start, end]) => v4 >= start && v4 <= end);
  }
  return false;
}

function isGigaHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return (
    host === "giga3ai.com" ||
    host === "www.giga3ai.com" ||
    host.endsWith(".convex.cloud") ||
    host.endsWith(".convex.site")
  );
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const withSlash = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return withSlash.toLowerCase();
}

/** Block admin, API, and account paths. robots.txt and sitemap.xml stay public. */
export function isProtectedBrowsePath(url: URL): boolean {
  const path = url.pathname;
  const lower = path.toLowerCase();
  if (lower === "/robots.txt" || lower === "/sitemap.xml" || lower.startsWith("/sitemap-")) {
    return false;
  }
  if (lower === "/admin" || lower.startsWith("/admin/")) return true;
  if (lower === "/api" || lower.startsWith("/api/")) return true;
  if (!isGigaHost(url.hostname)) return false;
  const normalized = normalizePath(path);
  return GIGA_PRIVATE_PREFIXES.some(
    (prefix) => normalized === `${prefix}/` || normalized.startsWith(`${prefix}/`)
  );
}

export function classifyBrowseUrl(raw: string):
  | { ok: true; url: URL }
  | { ok: false; code: BrowseErrorCode } {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return { ok: false, code: "invalid_url" };
  if (/^(javascript|data|file|ftp|blob|ws|wss):/i.test(trimmed)) {
    return { ok: false, code: "unsupported_protocol" };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, code: "invalid_url" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, code: "unsupported_protocol" };
  }
  if (parsed.username || parsed.password) return { ok: false, code: "blocked_destination" };
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!host || BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    return { ok: false, code: "blocked_destination" };
  }
  if (/^\d+$/.test(host)) return { ok: false, code: "blocked_destination" };
  if (isBlockedIpAddress(host)) return { ok: false, code: "blocked_destination" };
  if (isProtectedBrowsePath(parsed)) return { ok: false, code: "blocked_destination" };
  return { ok: true, url: parsed };
}

export function publicAuditUrl(path: string): string | null {
  const normalized = path === "/" ? "/" : path.endsWith("/") ? path : `${path}/`;
  const allowed = PUBLIC_AUDIT_PATHS.some((item) => item === normalized || item === path);
  if (!allowed) return null;
  return `https://www.giga3ai.com${normalized === "/" ? "/" : normalized}`;
}

/** Drop query strings so logs cannot keep tokens that arrived in a URL. */
export function logSafeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "invalid-url";
  }
}
