/**
 * Feature-flagged OneSignal Web Push config for the Giga3 AI blog.
 *
 * Disabled unless BOTH are set at build time:
 * - NEXT_PUBLIC_GIGA3_BLOG_PUSH_ENABLED=true
 * - NEXT_PUBLIC_ONESIGNAL_APP_ID=<dashboard App ID>
 *
 * Never put a OneSignal REST API key (or any server secret) in NEXT_PUBLIC_*.
 */

export const BLOG_PUSH_SW_PATH = "push/onesignal/OneSignalSDKWorker.js";
export const BLOG_PUSH_SW_SCOPE = "/push/onesignal/";

/** localStorage: reader dismissed the soft prompt */
export const BLOG_PUSH_DISMISS_KEY = "giga3:blog-push:dismissed";
/** localStorage: reader chose not to be asked again */
export const BLOG_PUSH_MUTE_KEY = "giga3:blog-push:muted";

const APPROVED_ORIGINS = new Set(["https://www.giga3ai.com", "https://giga3ai.com"]);

export function isBlogPushEnabled(
  env: { enabled?: string | undefined; appId?: string | undefined } = {
    enabled: process.env.NEXT_PUBLIC_GIGA3_BLOG_PUSH_ENABLED,
    appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
  }
): boolean {
  const flag = (env.enabled ?? "").trim().toLowerCase();
  const appId = (env.appId ?? "").trim();
  if (flag !== "true" && flag !== "1") return false;
  // Basic UUID-ish guard — never invent an App ID; require a real dashboard value.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appId)) {
    return false;
  }
  return true;
}

export function getOneSignalAppId(
  envAppId: string | undefined = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
): string | null {
  if (!isBlogPushEnabled({ enabled: process.env.NEXT_PUBLIC_GIGA3_BLOG_PUSH_ENABLED, appId: envAppId })) {
    return null;
  }
  return (envAppId ?? "").trim() || null;
}

/** Reject notification click targets that are not Giga3 AI blog URLs. */
export function isApprovedBlogNotificationUrl(url: string, siteOrigin = "https://www.giga3ai.com"): boolean {
  try {
    const parsed = new URL(url, siteOrigin);
    if (!APPROVED_ORIGINS.has(parsed.origin)) return false;
    if (parsed.protocol !== "https:") return false;
    const path = parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`;
    return path === "/blog/" || path.startsWith("/blog/");
  } catch {
    return false;
  }
}

export function buildBlogArticleNotificationUrl(slug: string, siteOrigin = "https://www.giga3ai.com"): string {
  const clean = slug.replace(/^\/+|\/+$/g, "");
  return `${siteOrigin}/blog/${clean}/`;
}
