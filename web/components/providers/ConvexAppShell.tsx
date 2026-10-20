import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { SessionQueryErrorBoundary } from "@/components/providers/SessionQueryErrorBoundary";
import { ReactNode } from "react";

/** Wrap client trees that call Convex hooks (static export safe). */
export function ConvexAppShell({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      <SessionQueryErrorBoundary>{children}</SessionQueryErrorBoundary>
    </ConvexClientProvider>
  );
}
