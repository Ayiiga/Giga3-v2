"use client";

import { AppBadgeSync } from "@/components/pwa/AppBadgeSync";
import { memo, type ReactNode } from "react";

/**
 * Engagement badge host. Keeps Badging API sync independent of page chrome.
 * Renders existing AppBadgeSync — no notification API changes.
 */
export const BadgeProvider = memo(function BadgeProvider({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <>
      <AppBadgeSync />
      {children}
    </>
  );
});
