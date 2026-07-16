"use client";

import { cn } from "@/lib/utils";
import { memo } from "react";

interface SocialAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  square?: boolean;
  /** Gradient story ring (GigaSocial stories/reels). */
  hasStory?: boolean;
  /** Green accent when unseen story content exists. */
  hasUnviewedStory?: boolean;
}

const SIZE_CLASS = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-2xl",
  xl: "h-24 w-24 text-3xl",
} as const;

const STORY_RING_PADDING = {
  sm: "p-[2px]",
  md: "p-[2px]",
  lg: "p-[2.5px]",
  xl: "p-[3px]",
} as const;

export const SocialAvatar = memo(function SocialAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
  square = false,
  hasStory = false,
  hasUnviewedStory = false,
}: SocialAvatarProps) {
  const initial = (name.trim() || "?").slice(0, 1).toUpperCase();
  const shape = square ? "rounded-2xl" : "rounded-full";
  const innerShape = square ? "rounded-[14px]" : "rounded-full";

  const avatarNode = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt=""
      className={cn("h-full w-full object-cover", innerShape)}
    />
  ) : (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600 font-bold text-white shadow-sm",
        innerShape
      )}
      aria-hidden
    >
      {initial}
    </div>
  );

  if (!hasStory) {
    if (avatarUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className={cn("shrink-0 object-cover", SIZE_CLASS[size], shape, className)}
        />
      );
    }

    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600 font-bold text-white shadow-sm",
          SIZE_CLASS[size],
          shape,
          className
        )}
        aria-hidden
      >
        {initial}
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          STORY_RING_PADDING[size],
          shape,
          hasUnviewedStory
            ? "bg-gradient-to-tr from-emerald-400 via-violet-500 to-fuchsia-500"
            : "bg-gradient-to-tr from-violet-500 via-indigo-500 to-fuchsia-500"
        )}
      >
        <div className={cn("bg-white", STORY_RING_PADDING[size], shape)}>
          <div className={cn(SIZE_CLASS[size], shape, "overflow-hidden")}>{avatarNode}</div>
        </div>
      </div>
      {hasUnviewedStory ? (
        <span
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"
          aria-hidden
        />
      ) : null}
    </div>
  );
});
