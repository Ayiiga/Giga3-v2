import {
  CANONICAL_PRODUCTION_CONVEX_URL,
  normalizeConvexUrl,
} from "@/lib/convex/env";
import Script from "next/script";

/**
 * Injects the Convex URL before any app JS runs. Chat HTML is never cached by
 * the service worker, so this overrides stale PWA bundles that still embed a
 * deleted deployment (e.g. happy-otter-123.convex.cloud).
 */
export function ConvexRuntimeBootstrap() {
  const convexUrl =
    normalizeConvexUrl(process.env.NEXT_PUBLIC_CONVEX_URL) ??
    CANONICAL_PRODUCTION_CONVEX_URL;

  return (
    <Script id="giga3-convex-bootstrap" strategy="beforeInteractive">
      {`window.__GIGA3_CONVEX_URL__=${JSON.stringify(convexUrl)};`}
    </Script>
  );
}
