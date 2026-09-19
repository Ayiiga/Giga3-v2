"use client";

import { normalizeAppPath, safeNavigate } from "@/lib/navigation/safeNavigate";
import { cn } from "@/lib/utils";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

interface StableLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  children: ReactNode;
  /** When true, always use a full page load (recommended from 404 and overflow menus). */
  hard?: boolean;
}

/**
 * Static-export friendly link: plain <a> with trailing-slash normalization.
 * Optional hard navigation avoids client-router crashes on stale PWAs.
 */
export function StableLink({
  href,
  children,
  className,
  hard = false,
  onClick,
  ...props
}: StableLinkProps) {
  const normalized = normalizeAppPath(href);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;

    if (hard) {
      event.preventDefault();
      safeNavigate(normalized);
    }
  }

  return (
    <a href={normalized} className={cn(className)} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
