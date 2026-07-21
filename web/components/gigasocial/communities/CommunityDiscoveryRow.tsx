"use client";

import { suggestCommunities } from "@/lib/gigasocial/communityDiscovery";
import type { SocialCommunity } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { Compass } from "lucide-react";
import { memo, useMemo } from "react";

export const CommunityDiscoveryRow = memo(function CommunityDiscoveryRow({
  communities,
  interests,
  onSelect,
  className,
}: {
  communities: SocialCommunity[];
  interests?: string[];
  onSelect?: (slug: string) => void;
  className?: string;
}) {
  const suggestions = useMemo(
    () =>
      suggestCommunities(communities, {
        interests: interests?.length ? interests : ["education", "ai", "creator", "africa"],
        regionHint: "africa",
        countryHint: "ghana",
      }),
    [communities, interests]
  );

  if (!suggestions.length) return null;

  return (
    <section className={cn("space-y-2", className)} aria-label="Recommended communities">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Compass className="h-4 w-4 text-accent" aria-hidden />
        Recommended for you
      </h3>
      <ul className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
        {suggestions.map((community) => (
          <li key={community.slug} className="shrink-0">
            <button
              type="button"
              onClick={() => onSelect?.(community.slug)}
              className="gigasocial-pressable min-w-[9.5rem] rounded-2xl border border-border bg-white px-3 py-2.5 text-left hover:border-accent/30"
            >
              <span className="text-base" aria-hidden>
                {community.emoji}
              </span>
              <span className="mt-1 block text-xs font-semibold text-foreground">
                {community.name}
              </span>
              <span className="block text-[10px] text-muted">{community.memberCount} members</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
});
