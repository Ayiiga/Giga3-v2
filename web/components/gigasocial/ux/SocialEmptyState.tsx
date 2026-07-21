"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { memo, type ReactNode } from "react";

export const SocialEmptyState = memo(function SocialEmptyState({
  title = "No posts yet.",
  description,
  icon,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  className,
  children,
}: {
  title?: string;
  description: string;
  icon?: LucideIcon;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <EmptyState title={title} description={description} icon={icon} showVision />
      {(primaryLabel && onPrimary) || (secondaryLabel && onSecondary) || children ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {primaryLabel && onPrimary ? (
            <Button type="button" size="sm" onClick={onPrimary} className="min-h-10">
              {primaryLabel}
            </Button>
          ) : null}
          {secondaryLabel && onSecondary ? (
            <Button type="button" size="sm" variant="outline" onClick={onSecondary} className="min-h-10">
              {secondaryLabel}
            </Button>
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  );
});
