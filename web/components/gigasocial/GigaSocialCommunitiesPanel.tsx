"use client";

import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import type { SocialCommunity } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Users } from "lucide-react";
import { memo, useState } from "react";

export const GigaSocialCommunitiesPanel = memo(function GigaSocialCommunitiesPanel({
  sessionToken,
  onSelectCommunity,
}: {
  sessionToken: string | null;
  onSelectCommunity?: (slug: string) => void;
}) {
  const data = useQuery(api.gigaSocial.listCommunities, {
    sessionToken: sessionToken ?? undefined,
  });
  const joinCommunity = useMutation(api.gigaSocial.joinCommunity);
  const leaveCommunity = useMutation(api.gigaSocial.leaveCommunity);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (data === undefined) {
    return <LoadingState label="Loading communities…" />;
  }

  const communities = data as SocialCommunity[];

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
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update membership.");
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Join communities to share and learn with others. Community creation will expand in a future release.
      </p>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {communities.map((community) => (
          <li
            key={community.slug}
            className={cn(
              "saas-card rounded-2xl border border-border p-4",
              community.joined && "border-accent/30 bg-accent/5"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  <span aria-hidden>{community.emoji}</span> {community.name}
                </p>
                <p className="mt-1 text-xs text-muted">{community.category}</p>
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
                className="min-h-9"
              >
                {busySlug === community.slug ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : community.joined ? (
                  "Joined"
                ) : (
                  "Join"
                )}
              </Button>
              {community.joined && onSelectCommunity && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onSelectCommunity(community.slug)}
                  className="min-h-9"
                >
                  View feed
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
});
