"use client";

import {
  CreateNavIcon,
  HomeNavIcon,
  LearnNavIcon,
  SocialNavIcon,
} from "@/components/navigation/PrimaryNavIcons";
import {
  PRIMARY_NAV_TABS,
  type PrimaryNavTabId,
  resolvePrimaryNavTab,
  shouldShowDesktopRail,
} from "@/lib/navigation/primaryNav";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, type ComponentType } from "react";

const PRIMARY_NAV_ICONS: Record<
  PrimaryNavTabId,
  ComponentType<{ active?: boolean; className?: string }>
> = {
  home: HomeNavIcon,
  learn: LearnNavIcon,
  create: CreateNavIcon,
  social: SocialNavIcon,
};

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
          const Icon = PRIMARY_NAV_ICONS[tab.id];
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
                <Icon active={active} />
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
