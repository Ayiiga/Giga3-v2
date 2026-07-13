"use client";

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
  className,
  children,
}: GigaSocialProfileLinkProps) {
  const href = buildGigaSocialProfileUrl(handle);

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-h-10 min-w-0 items-center gap-2 rounded-lg hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className
      )}
      aria-label={`View ${displayName}'s profile`}
    >
      {showAvatar ? (
        <SocialAvatar name={displayName} avatarUrl={avatarUrl} size={avatarSize} />
      ) : null}
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
  );
});
