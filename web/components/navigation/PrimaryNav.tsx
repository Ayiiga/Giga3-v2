"use client";

import {
  PRIMARY_NAV_TABS,
  resolvePrimaryNavTab,
  shouldShowDesktopRail,
} from "@/lib/navigation/primaryNav";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";

type PrimaryNavBarProps = {
  variant: "mobile" | "desktop";
  activeTab: ReturnType<typeof resolvePrimaryNavTab>;
};

const PrimaryNavBar = memo(function PrimaryNavBar({
  variant,
  activeTab,
}: PrimaryNavBarProps) {
  const isMobile = variant === "mobile";

  return (
    <nav
      className={cn(
        "primary-nav",
        isMobile ? "primary-nav--mobile" : "primary-nav--desktop"
      )}
      aria-label="Giga3 primary navigation"
    >
      <div className={cn("primary-nav__inner", isMobile && "primary-nav__inner--mobile")}>
        {PRIMARY_NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          const href = tab.href;

          return (
            <Link
              key={tab.id}
              href={href}
              className={cn("primary-nav__item", active && "primary-nav__item--active")}
              aria-current={active ? "page" : undefined}
              prefetch={tab.id === "home"}
            >
              <span className="primary-nav__icon" aria-hidden>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 2} />
              </span>
              <span className="primary-nav__label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

export type PrimaryNavProps = {
  pathname: string;
  immersive?: boolean;
  keyboardOpen?: boolean;
};

export const PrimaryNav = memo(function PrimaryNav({
  pathname,
  immersive = false,
  keyboardOpen = false,
}: PrimaryNavProps) {
  const activeTab = resolvePrimaryNavTab(pathname);
  const showRail = shouldShowDesktopRail(pathname);

  if (!activeTab || immersive || keyboardOpen) return null;

  return (
    <>
      <PrimaryNavBar variant="mobile" activeTab={activeTab} />
      {showRail ? <PrimaryNavBar variant="desktop" activeTab={activeTab} /> : null}
    </>
  );
});
