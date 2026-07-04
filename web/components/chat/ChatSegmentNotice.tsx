"use client";

import { memo } from "react";

export const ChatSegmentNotice = memo(function ChatSegmentNotice({
  message,
}: {
  message: string | null;
}) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="border-b border-border bg-zinc-50 px-4 py-2 text-center text-xs leading-relaxed text-muted"
    >
      {message}
    </p>
  );
});
