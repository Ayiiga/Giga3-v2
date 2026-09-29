"use client";

import {
  detectPrimaryLink,
  LINK_ACTIONS,
  type LinkActionId,
} from "@/lib/chat/urlDetection";
import { Link2 } from "lucide-react";
import { memo, useMemo } from "react";

interface ChatLinkDetectedBarProps {
  draft: string;
  disabled?: boolean;
  onApplyPrompt: (text: string) => void;
}

/**
 * Shows when the composer contains a public URL — offers read/analyze actions
 * without auto-sending. Uses the existing chat + live web pipeline on send.
 */
export const ChatLinkDetectedBar = memo(function ChatLinkDetectedBar({
  draft,
  disabled,
  onApplyPrompt,
}: ChatLinkDetectedBarProps) {
  const link = useMemo(() => detectPrimaryLink(draft), [draft]);
  if (!link) return null;

  function apply(action: LinkActionId) {
    const item = LINK_ACTIONS.find((a) => a.id === action);
    if (!item) return;
    onApplyPrompt(item.prompt(link!.url));
  }

  return (
    <div
      className="mx-2 mb-2 rounded-2xl border border-accent/25 bg-accent/5 px-3 py-2.5 sm:mx-4"
      role="region"
      aria-label="Link detected"
    >
      <div className="flex items-start gap-2">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">Link detected</p>
          <p className="truncate text-sm font-medium text-foreground">{link.title}</p>
          <p className="truncate text-xs text-muted">{link.domain}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {LINK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={disabled}
            onClick={() => apply(action.id)}
            className="min-h-9 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent/30 disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        Only publicly accessible pages can be read. Paywalled or login-only pages cannot be fetched directly.
      </p>
    </div>
  );
});
