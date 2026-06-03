"use client";

import {
  formatInterestSummary,
  parseInterestProfile,
} from "@/lib/chat/userInterests";
import { Sparkles } from "lucide-react";

interface UserLearningBannerProps {
  interestProfileJson?: string | null;
}

export function UserLearningBanner({ interestProfileJson }: UserLearningBannerProps) {
  const profile = parseInterestProfile(interestProfileJson);
  const summary = formatInterestSummary(profile);

  if (!summary) return null;

  return (
    <div
      className="flex items-start gap-2 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-blue-500/5 px-4 py-2.5 text-sm text-zinc-800 sm:text-base"
      role="status"
    >
      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" aria-hidden />
      <p>
        <span className="font-semibold text-black">Personalized for you</span>
        <span className="text-zinc-700">
          {" "}
          — Giga3 learns from your chats ({profile.messageCount} messages). {summary}
        </span>
      </p>
    </div>
  );
}
