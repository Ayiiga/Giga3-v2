"use client";

import { convex } from "@/lib/convex";
import { ConvexProvider } from "convex/react";
import { ReactNode } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted">
        <p>
          Set <code className="text-accent">NEXT_PUBLIC_CONVEX_URL</code> in{" "}
          <code>web/.env.local</code> (from root <code>npx convex dev</code>).
        </p>
      </div>
    );
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
