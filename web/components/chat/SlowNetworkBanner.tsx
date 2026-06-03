"use client";

import { WifiOff } from "lucide-react";

export function SlowNetworkBanner() {
  return (
    <div className="flex items-start gap-2 border-b border-cyan-500/20 bg-cyan-950/30 px-4 py-2 text-xs text-cyan-100/90">
      <WifiOff className="app-icon mt-0.5 text-cyan-400" aria-hidden />
      <p>
        Optimized for mobile networks: we use the fastest available AI server and
        keep replies shorter when your connection is slow. If chat stalls, wait a
        moment and tap send again.
      </p>
    </div>
  );
}
