"use client";

import { PullToRefresh } from "@/components/pwa/PullToRefresh";
import { refreshApp } from "@/lib/refresh";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Window-level pull-to-refresh for scrollable marketing / billing pages. */
export function AppPullToRefresh({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Chat uses an internal scroll container (MessageList) with its own PTR.
  const normalized = pathname?.replace(/\/$/, "") ?? "";
  const disabled = normalized === "/chat";

  return (
    <PullToRefresh onRefresh={refreshApp} disabled={disabled} className="min-h-dvh">
      {children}
    </PullToRefresh>
  );
}
