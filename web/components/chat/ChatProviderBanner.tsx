"use client";

import { Info, ShieldCheck } from "lucide-react";
import { memo } from "react";

interface ChatProviderBannerProps {
  label: string | null;
  usedFallback: boolean;
}

function ChatProviderBannerInner({ label, usedFallback }: ChatProviderBannerProps) {
  if (!label) return null;

  if (usedFallback) {
    return (
      <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-950/40 px-4 py-2 text-xs text-amber-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Primary AI was unavailable. Response via <strong>{label}</strong> — your
          message was not lost.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-b border-border bg-white/[0.02] px-4 py-1.5 text-xs text-muted">
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
      <span>Connected via {label}</span>
    </div>
  );
}

export const ChatProviderBanner = memo(ChatProviderBannerInner);
