"use client";

import { ConvexReactClient } from "convex/react";
import { getConvexUrl, requireConvexUrl } from "./convex/env";

let browserClient: ConvexReactClient | null = null;
let browserClientUrl: string | null = null;

/** Lazy client — avoids instantiating Convex during Next.js static export SSR. */
export function getConvexClient(): ConvexReactClient | null {
  if (typeof window === "undefined") return null;
  const url = getConvexUrl();
  if (!url) return null;
  if (browserClient && browserClientUrl === url) {
    return browserClient;
  }
  browserClient = new ConvexReactClient(url);
  browserClientUrl = url;
  return browserClient;
}

/** @deprecated use getConvexClient() */
export const convex =
  typeof window !== "undefined" ? getConvexClient() : null;

export { getConvexUrl, getConvexSiteUrl, requireConvexUrl } from "./convex/env";
