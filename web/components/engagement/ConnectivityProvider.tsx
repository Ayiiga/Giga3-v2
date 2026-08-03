"use client";

import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import {
  createContext,
  memo,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type ConnectivityContextValue = {
  browserOnline: boolean;
  reachable: boolean;
  effectiveOnline: boolean;
  probing: boolean;
  refresh: () => Promise<boolean>;
};

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);

/** Optional shared connectivity context for engagement UI modules. */
export const ConnectivityProvider = memo(function ConnectivityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value = useEffectiveOnline();
  const memo = useMemo(
    () => ({
      browserOnline: value.browserOnline,
      reachable: value.reachable,
      effectiveOnline: value.effectiveOnline,
      probing: value.probing,
      refresh: value.refresh,
    }),
    [value.browserOnline, value.effectiveOnline, value.probing, value.reachable, value.refresh]
  );

  return (
    <ConnectivityContext.Provider value={memo}>{children}</ConnectivityContext.Provider>
  );
});

export function useConnectivity(): ConnectivityContextValue {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) {
    throw new Error("useConnectivity must be used within ConnectivityProvider");
  }
  return ctx;
}
