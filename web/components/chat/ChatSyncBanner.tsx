"use client";

import { memo } from "react";

type ChatSyncBannerProps = {
  onRetrySync?: () => void;
};

/**
 * Outbox sync continues via background flush / SW sync. No visible banner —
 * queued sends stay optimistic in the message list until they land.
 */
export const ChatSyncBanner = memo(function ChatSyncBanner(
  _props: ChatSyncBannerProps
) {
  return null;
});
