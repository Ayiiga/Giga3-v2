"use client";

import { ChatProviderBanner } from "@/components/chat/ChatProviderBanner";
import { SlowNetworkBanner } from "@/components/chat/SlowNetworkBanner";
import { UserLearningBanner } from "@/components/chat/UserLearningBanner";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { memo } from "react";

interface ChatBannersProps {
  email: string;
  mounted: boolean;
  chatProviderLabel: string | null;
  usedFallback: boolean;
  interestProfileJson: string | null;
}

function bannersPropsEqual(prev: ChatBannersProps, next: ChatBannersProps): boolean {
  return (
    prev.email === next.email &&
    prev.mounted === next.mounted &&
    prev.chatProviderLabel === next.chatProviderLabel &&
    prev.usedFallback === next.usedFallback &&
    prev.interestProfileJson === next.interestProfileJson
  );
}

/** Banners are pure; platform hooks own data subscriptions. */
export const ChatBanners = memo(function ChatBanners({
  chatProviderLabel,
  usedFallback,
  interestProfileJson,
}: ChatBannersProps) {
  useRenderDiagnostic("ChatBanners");

  return (
    <>
      <SlowNetworkBanner />
      <UserLearningBanner interestProfileJson={interestProfileJson} />
      <ChatProviderBanner label={chatProviderLabel} usedFallback={usedFallback} />
    </>
  );
}, bannersPropsEqual);
