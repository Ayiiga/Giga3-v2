"use client";

import { getConvexClient } from "@/lib/convex";
import { getConvexUrl } from "@/lib/convex/env";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

function createBrowserConvexClient(): ConvexReactClient | null {
  if (typeof window === "undefined") return null;
  return getConvexClient();
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = getConvexUrl();

  if (!convexUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted">
        <p>
          Missing <code className="text-accent">NEXT_PUBLIC_CONVEX_URL</code>. Set it in
          GitHub Actions / Cloudflare Pages build environment (see DEPLOYMENT.md).
        </p>
      </div>
    );
  }

  const client = createBrowserConvexClient();
  if (!client) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted">
        Loading…
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
