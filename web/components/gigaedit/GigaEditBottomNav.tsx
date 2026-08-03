"use client";

import { Clapperboard, MessageSquare, Store, Sparkles, UsersRound, Wallet } from "lucide-react";
import Link from "next/link";

const ITEMS = [
  { href: "/gigasocial/", label: "Social", icon: UsersRound },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/marketplace/", label: "Market", icon: Store },
  { href: "/media/", label: "AI Studio", icon: Sparkles },
  { href: "/gigaedit/", label: "GigaEdit", icon: Clapperboard, current: true },
  { href: "/wallet/", label: "Wallet", icon: Wallet },
] as const;

export function GigaEditBottomNav() {
  return (
    <nav className="gigaedit-bottom-nav flex items-stretch gap-0.5" aria-label="Giga3 app navigation">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const current = "current" in item && item.current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className="min-h-11"
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
