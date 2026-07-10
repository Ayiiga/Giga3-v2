"use client";

import { usePlatformProfile } from "@/hooks/usePlatformProfile";
import { createContext, useContext, type ReactNode } from "react";

type PlatformProfileContextValue = ReturnType<typeof usePlatformProfile>;

const PlatformProfileContext = createContext<PlatformProfileContextValue | null>(null);

export function PlatformProfileProvider({ children }: { children: ReactNode }) {
  const value = usePlatformProfile();
  return (
    <PlatformProfileContext.Provider value={value}>{children}</PlatformProfileContext.Provider>
  );
}

export function usePlatformProfileContext(): PlatformProfileContextValue {
  const ctx = useContext(PlatformProfileContext);
  if (!ctx) {
    throw new Error("usePlatformProfileContext must be used within PlatformProfileProvider");
  }
  return ctx;
}
