"use client";

import type { ReactNode } from "react";

/**
 * Root layout wrapper. Window-level pull-to-refresh was removed: translating the
 * entire page on touch caused shaking/ghosting on mobile marketing/PWA views.
 * Chat keeps pull-to-refresh on the message list scroller only.
 */
export function AppPullToRefresh({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh">{children}</div>;
}
