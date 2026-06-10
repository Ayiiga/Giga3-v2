"use client";

import { ChatProviderBanner } from "@/components/chat/ChatProviderBanner";
import { SlowNetworkBanner } from "@/components/chat/SlowNetworkBanner";
import { UserLearningBanner } from "@/components/chat/UserLearningBanner";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { cn } from "@/lib/utils";
import { memo } from "react";

interface ChatBannersProps {
  email: string;
  mounted: boolean;
  hasMessages?: boolean;
  chatProviderLabel: string | null;
  usedFallback: boolean;
  interestProfileJson: string | null;
}

function bannersPropsEqual(prev: ChatBannersProps, next: ChatBannersProps): boolean {
  return (
    prev.email === next.email &&
    prev.mounted === next.mounted &&
    prev.hasMessages === next.hasMessages &&
    prev.chatProviderLabel === next.chatProviderLabel &&
    prev.usedFallback === next.usedFallback &&
    prev.interestProfileJson === next.interestProfileJson
  );
}

/** Banners are pure; platform hooks own data subscriptions. */
export const ChatBanners = memo(function ChatBanners({
  hasMessages = false,
  chatProviderLabel,
  usedFallback,
  interestProfileJson,
}: ChatBannersProps) {
  useRenderDiagnostic("ChatBanners");

  return (
    <div className="shrink-0">
      <div className={cn(hasMessages && "hidden sm:block")}>
        <SlowNetworkBanner />
        <UserLearningBanner interestProfileJson={interestProfileJson} />
      </div>
      <ChatProviderBanner label={chatProviderLabel} usedFallback={usedFallback} />
    </div>
  );
}, bannersPropsEqual);
