"use client";

import { OfflineModeBanner } from "@/components/pwa/OfflineModeBanner";
import { memo } from "react";

type ChatSyncBannerProps = {
  onRetrySync?: () => void;
};

/**
 * Subtle offline indicator only. Outbox sync still runs in the background —
 * this does not change send/queue business logic.
 */
export const ChatSyncBanner = memo(function ChatSyncBanner(
  _props: ChatSyncBannerProps
) {
  return (
    <OfflineModeBanner message="Offline Mode — you can read cached chats; sending waits until you're back online." />
  );
});
