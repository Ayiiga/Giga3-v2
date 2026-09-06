"use client";

import {
  formatAccessTime,
  responseBasisDetail,
  responseBasisLabel,
  verificationVerdictLabel,
  type LiveWebMessageMetadata,
} from "@/lib/chat/liveWebTypes";
import { memo } from "react";

interface ResearchResponseBadgeProps {
  metadata: LiveWebMessageMetadata | null;
}

export const ResearchResponseBadge = memo(function ResearchResponseBadge({
  metadata,
}: ResearchResponseBadgeProps) {
  if (!metadata) return null;

  const basis = responseBasisLabel(metadata);
  const detail = responseBasisDetail(metadata);
  const verdict = verificationVerdictLabel(metadata.verification?.verdict);

  return (
    <div className="mb-2 space-y-1 rounded-xl border border-border/60 bg-card/50 px-3 py-2 text-xs">
      {basis ? <p className="font-medium text-foreground">{basis}</p> : null}
      {detail ? <p className="text-muted">{detail}</p> : null}
      {verdict ? <p className="text-foreground">{verdict}</p> : null}
      {metadata.verification?.summary ? (
        <p className="text-muted">{metadata.verification.summary}</p>
      ) : null}
      {metadata.location ? (
        <div className="space-y-1 text-foreground">
          <p>{metadata.location.formattedAddress}</p>
          {metadata.location.accuracyMeters != null ? (
            <p className="text-muted">
              Accuracy: approximately {Math.round(metadata.location.accuracyMeters)} m
            </p>
          ) : null}
          {metadata.location.mapUrl ? (
            <a
              href={metadata.location.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-accent hover:underline"
            >
              View Map
            </a>
          ) : null}
        </div>
      ) : null}
      {metadata.checkedAt && metadata.basis !== "knowledge" ? (
        <p className="text-[11px] text-muted/80">
          Retrieved {formatAccessTime(metadata.checkedAt)}
        </p>
      ) : null}
    </div>
  );
});
