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
      className="flex items-center gap-2 border-b border-accent/15 bg-accent-subtle/50 px-4 py-2 text-xs text-accent sm:text-sm"
      role="status"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
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
