import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { ReactNode } from "react";

/** Wrap client trees that call Convex hooks (static export safe). */
export function ConvexAppShell({ children }: { children: ReactNode }) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
