"use client";

import { ChatProviderBanner } from "@/components/chat/ChatProviderBanner";
import { SlowNetworkBanner } from "@/components/chat/SlowNetworkBanner";
import { UserLearningBanner } from "@/components/chat/UserLearningBanner";
import { useInterestProfile } from "@/hooks/useInterestProfile";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { memo } from "react";

interface ChatBannersProps {
  email: string;
  mounted: boolean;
  chatProviderLabel: string | null;
  usedFallback: boolean;
}

function bannersPropsEqual(prev: ChatBannersProps, next: ChatBannersProps): boolean {
  return (
    prev.email === next.email &&
    prev.mounted === next.mounted &&
    prev.chatProviderLabel === next.chatProviderLabel &&
    prev.usedFallback === next.usedFallback
  );
}

/** Banners — subscribes to getInterestProfile only (not credits). */
export const ChatBanners = memo(function ChatBanners({
  email,
  mounted,
  chatProviderLabel,
  usedFallback,
}: ChatBannersProps) {
  useRenderDiagnostic("ChatBanners");

  const interestProfileJson = useInterestProfile(email, mounted);

  return (
    <>
      <SlowNetworkBanner />
      <UserLearningBanner interestProfileJson={interestProfileJson} />
      <ChatProviderBanner label={chatProviderLabel} usedFallback={usedFallback} />
    </>
  );
}, bannersPropsEqual);
