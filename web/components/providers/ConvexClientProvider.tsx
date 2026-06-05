"use client";

import { ConvexDiagnostics } from "@/components/providers/ConvexDiagnostics";
import { getConvexClient } from "@/lib/convex";
import { getConvexUrl } from "@/lib/convex/env";
import {
  isConvexProbeEnabled,
  isNoConvexClientEnabled,
} from "@/lib/debug/convexProbe";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useLayoutEffect, useState } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ConvexReactClient | null>(null);

  useLayoutEffect(() => {
    const c = getConvexClient();
    if (!c) {
      setClient(null);
      return;
    }
    if (isNoConvexClientEnabled()) {
      void c.close();
    }
    setClient(c);
  }, []);

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

  if (!client) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted">
        Loading…
      </div>
    );
  }

  return (
    <ConvexProvider client={client}>
      {isConvexProbeEnabled() ? <ConvexDiagnostics /> : null}
      {children}
    </ConvexProvider>
  );
}
