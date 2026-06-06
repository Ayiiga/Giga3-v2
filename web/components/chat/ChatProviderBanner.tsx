"use client";

import { Info } from "lucide-react";
import { memo } from "react";

interface ChatProviderBannerProps {
  label: string | null;
  usedFallback: boolean;
}

/** Only surfaces provider info when failover occurred — avoids constant status noise. */
export const ChatProviderBanner = memo(function ChatProviderBanner({
  label,
  usedFallback,
}: ChatProviderBannerProps) {
  if (!label || !usedFallback) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-2 border-b border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:px-4 sm:text-sm"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <p>
        Primary AI was unavailable. Response via <strong>{label}</strong> — your message
        was not lost.
      </p>
    </div>
  );
});
