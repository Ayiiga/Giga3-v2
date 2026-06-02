"use client";

import { getConvexClient } from "@/lib/convex";
import { getConvexUrl } from "@/lib/convex/env";
import { ConvexProvider } from "convex/react";
import { ReactNode, useEffect, useState } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ReturnType<typeof getConvexClient>>(null);

  useEffect(() => {
    setClient(getConvexClient());
  }, []);

  const url = getConvexUrl();
  if (!url) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted">
        <p>
          Set <code className="text-accent">NEXT_PUBLIC_CONVEX_URL</code> in{" "}
          <code>web/.env.local</code> (from <code>npx convex dev</code>).
        </p>
      </div>
    );
  }

  if (!client) {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
