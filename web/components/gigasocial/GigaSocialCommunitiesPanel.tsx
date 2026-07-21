"use client";

import { CommunityAssistantPanel } from "@/components/gigasocial/communities/CommunityAssistantPanel";
import { CommunityDiscoveryRow } from "@/components/gigasocial/communities/CommunityDiscoveryRow";
import { CommunitySkeleton } from "@/components/gigasocial/ux/PanelSkeletons";
import { SocialEmptyState } from "@/components/gigasocial/ux/SocialEmptyState";
import { Button } from "@/components/ui/Button";
import {
  buildCommunityInviteLink,
  COMMUNITY_FEATURES,
  COMMUNITY_TYPE_FILTERS,
  communityMatchesType,
} from "@/lib/gigasocial/communitiesCatalog";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { triggerHaptic } from "@/lib/gigasocial/haptics";
import type { SocialCommunity } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Check, Copy, Loader2, Users } from "lucide-react";
import { memo, useMemo, useState } from "react";

export const GigaSocialCommunitiesPanel = memo(function GigaSocialCommunitiesPanel({
  sessionToken,
  onSelectCommunity,
}: {
  sessionToken: string | null;
  onSelectCommunity?: (slug: string) => void;
}) {
  const features = useGigaSocialFeatures();
  const data = useQuery(api.gigaSocial.listCommunities, {
    sessionToken: sessionToken ?? undefined,
  });
  const joinCommunity = useMutation(api.gigaSocial.joinCommunity);
  const leaveCommunity = useMutation(api.gigaSocial.leaveCommunity);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const communities = useMemo(
    () => (data ?? []) as SocialCommunity[],
    [data]
  );

  const filtered = useMemo(() => {
    if (!features.enableCommunitiesV2 || typeFilter === "all") return communities;
    return communities.filter((community) => communityMatchesType(community, typeFilter));
  }, [communities, features.enableCommunitiesV2, typeFilter]);

  const activeCommunity = useMemo(
    () => communities.find((c) => c.slug === activeSlug) ?? null,
    [activeSlug, communities]
  );

  async function toggleJoin(community: SocialCommunity) {
    if (!sessionToken) {
      setError("Sign in to join communities.");
      return;
    }
    setBusySlug(community.slug);
    setError(null);
    try {
      if (community.joined) {
        await leaveCommunity({ sessionToken, communitySlug: community.slug });
      } else {
        await joinCommunity({ sessionToken, communitySlug: community.slug });
        triggerHaptic("success", features.enableHaptics);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update membership.");
      triggerHaptic("error", features.enableHaptics);
    } finally {
      setBusySlug(null);
    }
  }

  async function copyInvite(slug: string) {
    try {
      await navigator.clipboard.writeText(buildCommunityInviteLink(slug));
      setCopiedSlug(slug);
      triggerHaptic("light", features.enableHaptics);
      window.setTimeout(() => setCopiedSlug(null), 1600);
    } catch {
      setError("Could not copy invite link.");
    }
  }

  if (data === undefined) {
    return features.enableDelightfulUX ? (
      <CommunitySkeleton />
    ) : (
      <CommunitySkeleton count={2} />
    );
  }

  if (!communities.length) {
    return (
      <SocialEmptyState
        title="No communities yet."
        description="Community spaces will appear here as the catalog expands."
        icon={Users}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Intelligent collaboration spaces for schools, faith groups, creators, and local communities
        across Africa.
      </p>

      {error ? (
        <p
          className="gigasocial-feedback-error rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {features.enableCommunityDiscovery ? (
        <CommunityDiscoveryRow
          communities={communities}
          onSelect={(slug) => {
            setActiveSlug(slug);
            const el = document.getElementById(`community-card-${slug}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      ) : null}

      {features.enableCommunitiesV2 ? (
        <>
          <div
            className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5"
            role="tablist"
            aria-label="Community types"
          >
            {COMMUNITY_TYPE_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={typeFilter === filter.id}
                onClick={() => setTypeFilter(filter.id)}
                className={cn(
                  "gigasocial-pressable inline-flex min-h-8 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-medium",
                  typeFilter === filter.id
                    ? "border-accent/40 bg-accent/10 text-foreground"
                    : "border-border bg-white text-muted"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5" aria-label="Community features">
            {COMMUNITY_FEATURES.slice(0, 8).map((feature) => (
              <span
                key={feature.id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-1 text-[10px] text-muted"
              >
                <span aria-hidden>{feature.emoji}</span>
                {feature.label}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {activeCommunity && features.enableCommunityAI ? (
        <CommunityAssistantPanel community={activeCommunity} />
      ) : null}

      {filtered.length === 0 ? (
        <SocialEmptyState
          title="No matching communities."
          description="Try another type filter or browse recommendations above."
          icon={Users}
          primaryLabel="Show all"
          onPrimary={() => setTypeFilter("all")}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((community) => (
            <li
              key={community.slug}
              id={`community-card-${community.slug}`}
              className={cn(
                "gigasocial-pressable saas-card rounded-2xl border border-border p-4",
                community.joined && "border-accent/30 bg-accent/5",
                activeSlug === community.slug && "ring-2 ring-violet-300/50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    <span aria-hidden>{community.emoji}</span> {community.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {community.category}
                    {community.communityType ? ` · ${community.communityType}` : ""}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {community.memberCount}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{community.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={community.joined ? "outline" : "primary"}
                  disabled={busySlug === community.slug}
                  onClick={() => void toggleJoin(community)}
                  className="min-h-10"
                >
                  {busySlug === community.slug ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : community.joined ? (
                    "Joined"
                  ) : (
                    "Join"
                  )}
                </Button>
                {community.joined && onSelectCommunity ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onSelectCommunity(community.slug)}
                    className="min-h-10"
                  >
                    View feed
                  </Button>
                ) : null}
                {features.enableCommunitiesV2 ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setActiveSlug((current) =>
                          current === community.slug ? null : community.slug
                        )
                      }
                      className="min-h-10"
                    >
                      Tools
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void copyInvite(community.slug)}
                      className="min-h-10"
                      aria-label={`Copy invite link for ${community.name}`}
                    >
                      {copiedSlug === community.slug ? (
                        <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden />
                      )}
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
