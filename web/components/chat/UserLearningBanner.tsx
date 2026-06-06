"use client";

import {
  formatInterestSummary,
  parseInterestProfile,
} from "@/lib/chat/userInterests";
import { Sparkles } from "lucide-react";
import { memo } from "react";

interface UserLearningBannerProps {
  interestProfileJson?: string | null;
}

function UserLearningBannerInner({
  interestProfileJson,
}: UserLearningBannerProps) {
  const profile = parseInterestProfile(interestProfileJson);
  const summary = formatInterestSummary(profile);

  if (!summary) return null;

  return (
    <div
      className="flex items-center gap-2 border-b border-violet-100 bg-violet-50/50 px-3 py-1.5 text-[11px] text-violet-900/90 sm:px-4 sm:text-xs"
      role="status"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
      <p className="min-w-0 truncate leading-snug">
        <span className="font-semibold">Personalized</span>
        <span className="text-violet-800/80"> · {summary}</span>
      </p>
    </div>
  );
}

export const UserLearningBanner = memo(
  UserLearningBannerInner,
  (prev, next) => prev.interestProfileJson === next.interestProfileJson
);
