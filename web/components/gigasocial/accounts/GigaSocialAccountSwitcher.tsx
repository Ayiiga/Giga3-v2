"use client";

import type { SocialAccountSummary } from "@/lib/gigasocial/activeSocialAccount";
import { writeActiveSocialProfileId } from "@/lib/gigasocial/activeSocialAccount";
import { cn } from "@/lib/utils";
import { Check, UsersRound } from "lucide-react";
import { memo } from "react";

export const GigaSocialAccountSwitcher = memo(function GigaSocialAccountSwitcher({
  accounts,
  activeProfileId,
  onChange,
  className,
  compact = false,
}: {
  accounts: SocialAccountSummary[];
  activeProfileId: string | null;
  onChange: (profileId: string) => void;
  className?: string;
  compact?: boolean;
}) {
  if (accounts.length <= 1) return null;

  return (
    <div className={cn("space-y-1.5", className)}>
      {!compact ? (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <UsersRound className="h-3.5 w-3.5" aria-hidden />
          Posting as
        </p>
      ) : null}
      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5">
        {accounts.map((account) => {
          const active = account.profileId === activeProfileId;
          return (
            <button
              key={account.profileId}
              type="button"
              onClick={() => {
                writeActiveSocialProfileId(account.profileId);
                onChange(account.profileId);
              }}
              className={cn(
                "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
                active
                  ? "border-accent/40 bg-accent/10 text-foreground"
                  : "border-border bg-white text-muted hover:bg-accent/5"
              )}
              aria-pressed={active}
            >
              {active ? <Check className="h-3.5 w-3.5 text-accent" aria-hidden /> : null}
              <span className="max-w-[9rem] truncate">
                @{account.handle}
                {account.isMain ? " · Main" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
