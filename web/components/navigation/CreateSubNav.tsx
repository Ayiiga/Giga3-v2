"use client";

import {
  CREATE_SUB_DESTINATIONS,
  resolveCreateSubDestination,
} from "@/lib/navigation/createDestinations";
import { cn } from "@/lib/utils";
import { Clapperboard, Sparkles } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

const ICONS = {
  media: Sparkles,
  gigaedit: Clapperboard,
} as const;

export type CreateSubNavProps = {
  pathname: string;
  /** Bottom bar row above primary tabs */
  variant?: "bar" | "inline";
  className?: string;
};

export const CreateSubNav = memo(function CreateSubNav({
  pathname,
  variant = "inline",
  className,
}: CreateSubNavProps) {
  const active = resolveCreateSubDestination(pathname);
  if (!active) return null;

  const isBar = variant === "bar";

  return (
    <nav
      className={cn(
        "create-sub-nav",
        isBar ? "create-sub-nav--bar" : "create-sub-nav--inline",
        className
      )}
      aria-label="Create tools"
    >
      {CREATE_SUB_DESTINATIONS.map((dest) => {
        const Icon = ICONS[dest.id];
        const selected = dest.id === active;
        return (
          <Link
            key={dest.id}
            href={dest.href}
            className={cn(
              "create-sub-nav__item",
              selected && "create-sub-nav__item--active"
            )}
            aria-current={selected ? "page" : undefined}
          >
            <Icon className="create-sub-nav__icon" aria-hidden />
            {isBar ? (
              <span className="create-sub-nav__label">{dest.shortLabel}</span>
            ) : (
              <span className="create-sub-nav__copy">
                <span className="create-sub-nav__label">{dest.label}</span>
                <span className="create-sub-nav__hint">{dest.description}</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
});
