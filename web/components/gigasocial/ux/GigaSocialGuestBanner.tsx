"use client";

import { ButtonLink } from "@/components/ui/Button";
import { memo } from "react";

export const GigaSocialGuestBanner = memo(function GigaSocialGuestBanner({
  nextPath = "/gigasocial/",
}: {
  nextPath?: string;
}) {
  const next = encodeURIComponent(nextPath);
  return (
    <div className="gigasocial-status-banner gigasocial-status-banner--guest" role="status">
      <p className="min-w-0 flex-1">
        Browsing as a guest. Sign in to post, comment, like, and message.
      </p>
      <ButtonLink href={`/chat/login?next=${next}`} size="sm" className="min-h-11 shrink-0">
        Sign in
      </ButtonLink>
    </div>
  );
});
