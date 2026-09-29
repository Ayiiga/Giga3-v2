"use client";

import {
  formatInterestSummary,
  parseInterestProfile,
} from "@/lib/chat/userInterests";
import { Sparkles } from "lucide-react";
import { memo, useState } from "react";

interface UserLearningBannerProps {
  interestProfileJson?: string | null;
}

/**
 * Simple "Personalized" indicator — technical interest details stay hidden
 * until the user taps to see them. No internal mode ids or topic arrays
 * are shown prominently.
 */
function UserLearningBannerInner({
  interestProfileJson,
}: UserLearningBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const profile = parseInterestProfile(interestProfileJson);
  const summary = formatInterestSummary(profile);

  if (!summary) return null;

  return (
    <div
      className="flex items-center gap-2 border-b border-violet-100 bg-violet-50/50 px-3 py-1.5 text-[11px] text-violet-900/90 sm:px-4 sm:text-xs"
      role="status"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? "Hide personalization details" : "Show personalization details"}
        className="flex min-h-9 min-w-0 flex-1 items-center gap-1.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <span className="shrink-0 font-semibold">✨ Personalized</span>
        {expanded ? (
          <span className="min-w-0 truncate leading-snug text-violet-800/80">
            {summary}
          </span>
        ) : (
          <span className="shrink-0 text-violet-800/70 underline-offset-2 hover:underline">
            Details
          </span>
        )}
      </button>
    </div>
  );
}

export const UserLearningBanner = memo(
  UserLearningBannerInner,
  (prev, next) => prev.interestProfileJson === next.interestProfileJson
);
