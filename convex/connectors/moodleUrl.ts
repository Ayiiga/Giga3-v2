/**
 * Pure Moodle site-URL validation (no Node HTTPS/DNS).
 * Used by the Moodle provider, connectMoodle action, and the web form.
 * SSRF destination checks after DNS stay in providers/moodle.ts.
 */

import { isBlockedIpAddress, ipv4ToInt } from "../liveWeb/browsePolicy";

export type MoodleUrlValidation =
  | { ok: true; normalized: string }
  | { ok: false; message: string };

export type MoodleTokenValidation =
  | { ok: true; token: string }
  | { ok: false; message: string };

/**
 * Block localhost, link-local, private/reserved IPv4 literals, and IPv6 literals
 * in the URL hostname (pre-DNS). Resolved addresses are checked separately.
 */
export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h === "localhost.localdomain" ||
    h === "metadata.google.internal" ||
    h.endsWith(".internal") ||
    h === "0.0.0.0" ||
    h === "[::1]" ||
    h === "[::]"
  ) {
    return true;
  }

  if (/^0x[0-9a-f]+$/i.test(h) || /^\d+$/.test(h)) {
    return true;
  }

  if (isProhibitedMoodleDestinationIp(h)) return true;

  if (/^\d+(\.\d+)*$/.test(h) && !/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;

  if (h.includes(":") || h.startsWith("[")) return true;

  return false;
}

/** Extra ranges beyond browsePolicy (CGNAT, multicast/reserved). */
export function isProhibitedMoodleDestinationIp(address: string): boolean {
  if (isBlockedIpAddress(address)) return true;
  const raw = address.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const v4 = ipv4ToInt(raw);
  if (v4 !== null) {
    const a = (v4 >>> 24) & 0xff;
    const b = (v4 >>> 16) & 0xff;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
  }
  return false;
}

/**
 * Validate and normalize a user-entered Moodle site URL.
 * Accepts HTTPS URLs and hostnames without a scheme (https:// is assumed).
 * Does not perform DNS — destination IP checks happen at connect time.
 */
export function validateMoodleSiteUrl(raw: string): MoodleUrlValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      message: "Enter your Moodle site URL, for example https://learn.example.edu",
    };
  }
  if (/\s/.test(trimmed)) {
    return {
      ok: false,
      message: "Moodle site URL must not contain spaces.",
    };
  }
  if (/^https?:\/\/[^/@\s]+:[^/@\s]+@/i.test(trimmed)) {
    return {
      ok: false,
      message: "Moodle site URL must not include usernames or passwords.",
    };
  }

  let candidate = trimmed;
  // Bare host or host/path → assume HTTPS (production Moodle sites).
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      ok: false,
      message:
        "That is not a valid Moodle site URL. Use https://your-school.edu or https://your-school.edu/moodle",
    };
  }

  if (parsed.hash) {
    return {
      ok: false,
      message: "Moodle site URL must not include a # fragment.",
    };
  }

  if (parsed.protocol === "http:") {
    return {
      ok: false,
      message: "Moodle site URL must use https:// (HTTP is not allowed).",
    };
  }
  if (parsed.protocol !== "https:") {
    return {
      ok: false,
      message: "Unsupported URL scheme. Moodle site URL must start with https://",
    };
  }
  if (parsed.username || parsed.password) {
    return {
      ok: false,
      message: "Moodle site URL must not include usernames or passwords.",
    };
  }
  if (!parsed.hostname) {
    return {
      ok: false,
      message: "Moodle site URL is missing a hostname.",
    };
  }
  if (isBlockedHostname(parsed.hostname)) {
    return {
      ok: false,
      message:
        "That Moodle host is not allowed. Use a public HTTPS site (not localhost or private network addresses).",
    };
  }

  const path = parsed.pathname.replace(/\/+$/, "");
  const normalized = `${parsed.protocol}//${parsed.host}${path}`;
  return { ok: true, normalized };
}

/** Throw-on-error wrapper for server call sites. */
export function normalizeSiteUrl(siteUrl: string): string {
  const result = validateMoodleSiteUrl(siteUrl);
  if (!result.ok) throw new Error(result.message);
  return result.normalized;
}

export function validateMoodleToken(raw: string): MoodleTokenValidation {
  const token = raw.trim();
  if (!token) {
    return {
      ok: false,
      message: "Enter your personal Moodle web-service token (not an admin password).",
    };
  }
  if (token.length < 16) {
    return {
      ok: false,
      message: "That Moodle token looks too short. Paste the full web-service token from your Moodle profile.",
    };
  }
  if (/\s/.test(token)) {
    return {
      ok: false,
      message: "Moodle token must not contain spaces.",
    };
  }
  return { ok: true, token };
}

/** Map server/provider errors to safe UI copy (never leak tokens). */
export function safeMoodleConnectErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  if (lower.includes("token") && (lower.includes("invalid") || lower.includes("short"))) {
    return raw.startsWith("That Moodle") || raw.startsWith("Enter your") || raw.startsWith("Invalid")
      ? raw
      : "Moodle rejected this web-service token. Check the token and that web services are enabled.";
  }
  if (
    lower.includes("site url") ||
    lower.includes("https") ||
    lower.includes("hostname") ||
    lower.includes("not allowed") ||
    lower.includes("fragment") ||
    lower.includes("scheme") ||
    lower.includes("credentials") ||
    lower.includes("username")
  ) {
    return raw;
  }
  if (lower.includes("destination is not allowed") || lower.includes("dns")) {
    return "Moodle site destination is not allowed or could not be resolved. Use a public HTTPS Moodle URL.";
  }
  if (lower.includes("timed out") || lower.includes("timeout")) {
    return "Moodle did not respond in time. Check the site URL and try again.";
  }
  if (lower.includes("redirect")) {
    return "Moodle returned a redirect, which is not allowed. Use the final HTTPS site URL.";
  }
  if (lower.includes("exception") || lower.includes("web service") || lower.includes("access")) {
    return "Moodle rejected the request. Confirm the token permissions include site info / course access.";
  }
  if (lower.includes("invalid response") || lower.includes("failed")) {
    return "Could not verify this Moodle site with the supplied token. Check the URL and token, then try again.";
  }
  // Never echo unknown server internals.
  return "Could not connect to Moodle. Check the HTTPS site URL and personal web-service token, then try again.";
}
