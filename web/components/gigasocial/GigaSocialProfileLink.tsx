"use client";

import { GigaSocialFanButton } from "@/components/gigasocial/fans/GigaSocialFanButton";
import { SocialAvatar } from "@/components/gigasocial/SocialAvatar";
import { buildGigaSocialProfileUrl } from "@/lib/gigasocial/shareLinks";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { memo, type ReactNode } from "react";

interface GigaSocialProfileLinkProps {
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  avatarSize?: "sm" | "md" | "lg" | "xl";
  showAvatar?: boolean;
  showHandle?: boolean;
  showFollowOnAvatar?: boolean;
  creatorId?: string;
  sessionToken?: string | null;
  supporting?: boolean;
  onFollowChange?: (supporting: boolean, fanCount?: number) => void;
  className?: string;
  children?: ReactNode;
}

export const GigaSocialProfileLink = memo(function GigaSocialProfileLink({
  handle,
  displayName,
  avatarUrl,
  avatarSize = "md",
  showAvatar = true,
  showHandle = true,
  showFollowOnAvatar = false,
  creatorId,
  sessionToken,
  supporting = false,
  onFollowChange,
  className,
  children,
}: GigaSocialProfileLinkProps) {
  const normalizedHandle = handle.replace(/^@/, "").trim().toLowerCase();
  const href = buildGigaSocialProfileUrl(normalizedHandle);
  const canFollow = Boolean(
    showFollowOnAvatar && sessionToken && creatorId && sessionToken !== creatorId
  );

  if (!normalizedHandle) {
    return (
      <div className={cn("flex min-w-0 items-start gap-2", className)}>
        {showAvatar ? (
          <SocialAvatar name={displayName} avatarUrl={avatarUrl} size={avatarSize} />
        ) : null}
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{displayName}</span>
          {showHandle ? <span className="block truncate text-xs text-muted">@unknown</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-start gap-2", className)}>
      {showAvatar ? (
        <div className="relative shrink-0">
          <Link
            href={href}
            prefetch={false}
            className="block rounded-lg hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label={`View ${displayName}'s profile`}
          >
            <SocialAvatar name={displayName} avatarUrl={avatarUrl} size={avatarSize} />
          </Link>
          {canFollow ? (
            <GigaSocialFanButton
              sessionToken={sessionToken!}
              creatorId={creatorId!}
              supporting={supporting}
              useFollowLabels
              overlay
              className="absolute -bottom-0.5 -right-0.5"
              onChange={onFollowChange}
            />
          ) : null}
        </div>
      ) : null}
      <Link
        href={href}
        prefetch={false}
        className="group min-w-0 flex-1 rounded-lg hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label={`View ${displayName}'s profile`}
      >
        <span className="min-w-0">
          {children ?? (
            <>
              <span className="block truncate text-sm font-semibold text-foreground group-hover:text-accent">
                {displayName}
              </span>
              {showHandle ? (
                <span className="block truncate text-xs text-muted">@{normalizedHandle}</span>
              ) : null}
            </>
          )}
        </span>
      </Link>
    </div>
  );
});
