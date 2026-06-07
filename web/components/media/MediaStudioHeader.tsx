"use client";

import { CreditBadge } from "@/components/billing/CreditBadge";
import { UsageTracker } from "@/components/billing/UsageTracker";
import { ButtonLink } from "@/components/ui/Button";
import type { UsageSnapshot } from "@/lib/credits/constants";
import { memo } from "react";

interface MediaStudioHeaderProps {
  usage: UsageSnapshot | null;
}

export const MediaStudioHeader = memo(function MediaStudioHeader({
  usage,
}: MediaStudioHeaderProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="hero-title">
            Media Studio
          </h1>
          <p className="mt-3 text-base leading-[1.7] text-muted">
            AI images & videos · fal.ai with automatic fallback
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {usage && <CreditBadge credits={usage.credits} />}
          <ButtonLink href="/chat" variant="outline" size="md">
            Back to chat
          </ButtonLink>
        </div>
      </div>

      {usage && <UsageTracker usage={usage} />}
    </>
  );
});
