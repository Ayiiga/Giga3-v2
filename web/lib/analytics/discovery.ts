/** Bounded attribution labels. Never send raw referrers, search queries or URL parameters. */
export const DISCOVERY_SOURCES = [
  "direct", "google", "bing", "chatgpt", "perplexity", "claude", "gemini", "directory", "social", "other",
] as const;
export type DiscoverySource = typeof DISCOVERY_SOURCES[number];
export const DISCOVERY_STAGES = ["visit", "practice_start", "signup"] as const;
export type DiscoveryStage = typeof DISCOVERY_STAGES[number];

const SOURCE_HOSTS: Record<string, DiscoverySource> = {
  "google.com": "google", "google.com.gh": "google", "bing.com": "bing",
  "chatgpt.com": "chatgpt", "chat.openai.com": "chatgpt", "perplexity.ai": "perplexity",
  "claude.ai": "claude", "gemini.google.com": "gemini", "copilot.microsoft.com": "bing",
  "saashub.com": "directory", "crunchbase.com": "directory", "startupblink.com": "directory",
  "producthunt.com": "directory", "toolscout.ai": "directory", "f6s.com": "directory",
  "linkedin.com": "social", "facebook.com": "social", "instagram.com": "social",
  "t.me": "social", "telegram.org": "social", "whatsapp.com": "social", "t.co": "social", "x.com": "social",
};

export function discoverySource(referrer: string, utmSource = ""): DiscoverySource {
  const campaign = utmSource.trim().toLowerCase();
  // Campaign labels are self-reported, so attribution is indicative.
  if (campaign && Object.prototype.hasOwnProperty.call(SOURCE_HOSTS, campaign)) return SOURCE_HOSTS[campaign];
  if (campaign && (DISCOVERY_SOURCES as readonly string[]).includes(campaign)) return campaign as DiscoverySource;
  if (!referrer) return campaign ? "other" : "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host === "giga3ai.com" || host === "www.giga3ai.com") return "direct";
    if (Object.prototype.hasOwnProperty.call(SOURCE_HOSTS, host)) return SOURCE_HOSTS[host];
    const entry = Object.entries(SOURCE_HOSTS).find(([domain]) => host === domain || host.endsWith(`.${domain}`));
    return entry?.[1] ?? "other";
  } catch {
    return "other";
  }
}

export function isDiscoveryLanding(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  return ["/", "/gigalearn", "/gigalearn/exam", "/gigalearn/exam/bece", "/gigalearn/exam/wassce", "/gigalearn/exam/promotion", "/study-guides", "/ai-for-teachers-ghana", "/ai-for-bece-wassce-ghana", "/ai-tools-for-students-ghana", "/ai-for-business-ghana"].includes(path)
    || /^\/study-guides\/[a-z0-9-]+$/.test(path);
}

export function browserDiscoverySource(): DiscoverySource | undefined {
  if (typeof window === "undefined" || /bot|crawler|spider/i.test(navigator.userAgent)) return undefined;
  try {
    const stored = sessionStorage.getItem("giga3_discovery_source");
    if (stored && (DISCOVERY_SOURCES as readonly string[]).includes(stored)) return stored as DiscoverySource;
    if (!isDiscoveryLanding(window.location.pathname)) return undefined;
    const source = discoverySource(document.referrer, new URLSearchParams(window.location.search).get("utm_source") ?? "");
    sessionStorage.setItem("giga3_discovery_source", source);
    return source;
  } catch {
    return undefined;
  }
}
