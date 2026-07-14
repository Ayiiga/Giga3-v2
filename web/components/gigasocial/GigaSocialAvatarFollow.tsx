"use client";

import { GigaSocialFanButton } from "@/components/gigasocial/fans/GigaSocialFanButton";
import { SocialAvatar } from "@/components/gigasocial/SocialAvatar";
import { cn } from "@/lib/utils";
import { memo } from "react";

interface GigaSocialAvatarFollowProps {
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  avatarSize?: "sm" | "md" | "lg" | "xl";
  creatorId?: string;
  sessionToken?: string | null;
  supporting?: boolean;
  className?: string;
  avatarClassName?: string;
  onFollowChange?: (supporting: boolean) => void;
}

/** Avatar with an on-picture follow control for feed and profile surfaces. */
export const GigaSocialAvatarFollow = memo(function GigaSocialAvatarFollow({
  displayName,
  handle,
  avatarUrl,
  avatarSize = "md",
  creatorId,
  sessionToken,
  supporting = false,
  className,
  avatarClassName,
  onFollowChange,
}: GigaSocialAvatarFollowProps) {
  const canFollow = Boolean(sessionToken && creatorId && sessionToken !== creatorId);

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <SocialAvatar
        name={displayName}
        avatarUrl={avatarUrl}
        size={avatarSize}
        className={avatarClassName}
      />
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
  );
});
