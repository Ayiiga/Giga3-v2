"use client";

import { cn } from "@/lib/utils";
import { memo } from "react";

interface SocialAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  square?: boolean;
}

const SIZE_CLASS = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-2xl",
  xl: "h-24 w-24 text-3xl",
} as const;

export const SocialAvatar = memo(function SocialAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
  square = false,
}: SocialAvatarProps) {
  const initial = (name.trim() || "?").slice(0, 1).toUpperCase();
  const shape = square ? "rounded-2xl" : "rounded-full";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={cn(
          "shrink-0 object-cover",
          SIZE_CLASS[size],
          shape,
          className
        )}
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
});
