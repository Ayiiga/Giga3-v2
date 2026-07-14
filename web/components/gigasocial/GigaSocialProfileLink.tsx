"use client";

import { GigaSocialAvatarFollow } from "@/components/gigasocial/GigaSocialAvatarFollow";
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
  className,
  children,
}: GigaSocialProfileLinkProps) {
  const href = buildGigaSocialProfileUrl(handle);

  const avatarNode = showFollowOnAvatar ? (
    <GigaSocialAvatarFollow
      displayName={displayName}
      handle={handle}
      avatarUrl={avatarUrl}
      avatarSize={avatarSize}
      creatorId={creatorId}
      sessionToken={sessionToken}
      supporting={supporting}
    />
  ) : (
    <SocialAvatar name={displayName} avatarUrl={avatarUrl} size={avatarSize} />
  );

  return (
    <div className={cn("flex min-w-0 items-start gap-2", className)}>
      {showAvatar ? (
        <Link
          href={href}
          className="shrink-0 rounded-lg hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={`View ${displayName}'s profile`}
        >
          {avatarNode}
        </Link>
      ) : null}
      <Link
        href={href}
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
                <span className="block truncate text-xs text-muted">@{handle}</span>
              ) : null}
            </>
          )}
        </span>
      </Link>
    </div>
  );
});
