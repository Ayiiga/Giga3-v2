import {
  CANONICAL_PRODUCTION_CONVEX_URL,
  normalizeConvexUrl,
} from "@/lib/convex/env";
import Script from "next/script";

/**
 * Injects the Convex URL before any app JS runs. Chat/GigaSocial HTML may be
 * runtime-cached for offline reopen; this bootstrap + normalizeConvexUrl() keep
 * retired deployment hosts from sticking after a deploy.
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
