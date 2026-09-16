"use client";

import { CreateSubNav } from "@/components/navigation/CreateSubNav";
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
  pathname: string;
};

const PrimaryNavBar = memo(function PrimaryNavBar({
  variant,
  activeTab,
  pathname,
}: PrimaryNavBarProps) {
  const isMobile = variant === "mobile";
  const showCreateSub = activeTab === "create";

  return (
    <nav
      className={cn(
        "primary-nav",
        isMobile ? "primary-nav--mobile" : "primary-nav--desktop",
        showCreateSub && "primary-nav--with-create-sub"
      )}
      aria-label="Giga3 primary navigation"
    >
      {showCreateSub ? (
        <CreateSubNav pathname={pathname} variant="bar" className="primary-nav__create-sub" />
      ) : null}
      <div className={cn("primary-nav__inner", isMobile && "primary-nav__inner--mobile")}>
        {PRIMARY_NAV_TABS.map((tab) => {
          const Icon = PRIMARY_NAV_ICONS[tab.id];
          const active = tab.id === activeTab;
          const href = tab.href;

          return (
            <Link
              key={tab.id}
              href={href}
              data-nav={tab.id}
              className={cn("primary-nav__item", active && "primary-nav__item--active")}
              aria-current={active ? "page" : undefined}
              prefetch={tab.id === "home"}
            >
              <span className="primary-nav__icon" aria-hidden>
                <Icon active={active} className="primary-nav__glyph" />
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
      <PrimaryNavBar variant="mobile" activeTab={activeTab} pathname={pathname} />
      {showRail ? (
        <PrimaryNavBar variant="desktop" activeTab={activeTab} pathname={pathname} />
      ) : null}
    </>
  );
});
