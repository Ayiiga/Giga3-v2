import { isStandalonePwa } from "@/lib/analytics/clientId";

export { isStandalonePwa };

/** iPhone, iPad, or iPadOS desktop UA. */
export function isIOSDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** iOS Safari or WebKit-based in-app browsers that use Share → Add to Home Screen. */
export function isIOSSafariLike(): boolean {
  if (!isIOSDevice()) return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return !/android/.test(ua);
}
