"use client";

import { Info, ShieldCheck } from "lucide-react";

interface ChatProviderBannerProps {
  label: string | null;
  usedFallback: boolean;
}

export function ChatProviderBanner({ label, usedFallback }: ChatProviderBannerProps) {
  if (!label) return null;

  if (usedFallback) {
    return (
      <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-950/40 px-4 py-2 text-xs text-amber-100">
        <Info className="app-icon mt-0.5" aria-hidden />
        <p>
          Primary AI was unavailable. Response via <strong>{label}</strong> — your
          message was not lost.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-b border-border bg-white/[0.02] px-4 py-1.5 text-xs text-muted">
      <ShieldCheck className="app-icon text-emerald-400" aria-hidden />
      <span>Connected via {label}</span>
    </div>
  );
}
