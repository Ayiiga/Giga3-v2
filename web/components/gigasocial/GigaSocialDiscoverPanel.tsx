"use client";

import { GigaSocialTemplatesPanel } from "@/components/gigasocial/template/GigaSocialTemplatesPanel";
import { GigaSocialPostCard } from "@/components/gigasocial/GigaSocialPostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { DISCOVER_FILTERS, type DiscoverFilterId } from "@/lib/gigasocial/sections";
import type { SocialPost } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { LayoutTemplate, Search } from "lucide-react";
import { memo, useState } from "react";

type DiscoverView = "posts" | "templates";

export const GigaSocialDiscoverPanel = memo(function GigaSocialDiscoverPanel({
  sessionToken,
  initialView = "posts",
}: {
  sessionToken: string | null;
  initialView?: DiscoverView;
}) {
  const features = useGigaSocialFeatures();
  const [view, setView] = useState<DiscoverView>(
    initialView === "templates" && features.enableUseAsTemplate ? "templates" : "posts"
  );
  const [filter, setFilter] = useState<DiscoverFilterId>("trending");
  const [query, setQuery] = useState("");

  const data = useQuery(
    api.gigaSocial.listDiscover,
    view === "posts"
      ? {
          sessionToken: sessionToken ?? undefined,
          filter,
          query: query.trim() || undefined,
          limit: 24,
        }
      : "skip"
  );

  const toggleLike = useMutation(api.gigaSocial.toggleLike);
  const toggleBookmark = useMutation(api.gigaSocial.toggleBookmark);
  const recordShare = useMutation(api.gigaSocial.recordShare);

  const requireAuth = () => {
    window.dispatchEvent(new CustomEvent("gigasocial:require-auth"));
  };

  if (view === "templates" && features.enableUseAsTemplate) {
    return (
      <div className="space-y-4">
        <DiscoverViewTabs view={view} onChange={setView} enableTemplates />
        <GigaSocialTemplatesPanel sessionToken={sessionToken} />
      </div>
    );
  }

  if (data === undefined) {
    return <LoadingState label="Discovering posts…" />;
  }

  const posts = (data.posts ?? []) as SocialPost[];

  return (
    <div className="space-y-4">
      <DiscoverViewTabs
        view={view}
        onChange={setView}
        enableTemplates={features.enableUseAsTemplate}
      />

      <div className="flex flex-wrap gap-2">
        {DISCOVER_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium",
              filter === f.id
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border text-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts, topics, prompts…"
          aria-label="Search posts"
          className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 text-sm"
        />
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results"
          description="Try another filter or search term."
        />
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post._id}>
              <GigaSocialPostCard
                post={post}
                sessionToken={sessionToken}
                onRequireAuth={requireAuth}
                onLike={async (postId) => {
                  if (!sessionToken) {
                    requireAuth();
                    return;
                  }
                  await toggleLike({
                    sessionToken,
                    postId: postId as Id<"socialPosts">,
                  });
                }}
                onBookmark={async (postId) => {
                  if (!sessionToken) {
                    requireAuth();
                    return;
                  }
                  await toggleBookmark({
                    sessionToken,
                    postId: postId as Id<"socialPosts">,
                  });
                }}
                onShare={async (postId) => {
                  if (!sessionToken) {
                    requireAuth();
                    return;
                  }
                  await recordShare({
                    sessionToken,
                    postId: postId as Id<"socialPosts">,
                  });
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

function DiscoverViewTabs({
  view,
  onChange,
  enableTemplates,
}: {
  view: DiscoverView;
  onChange: (view: DiscoverView) => void;
  enableTemplates: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("posts")}
        className={cn(
          "min-h-9 rounded-full border px-4 py-1.5 text-xs font-semibold",
          view === "posts"
            ? "border-accent/40 bg-accent/10 text-foreground"
            : "border-border text-muted"
        )}
      >
        Posts
      </button>
      {enableTemplates ? (
        <button
          type="button"
          onClick={() => onChange("templates")}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold",
            view === "templates"
              ? "border-accent/40 bg-accent/10 text-foreground"
              : "border-border text-muted"
          )}
        >
          <LayoutTemplate className="h-3.5 w-3.5" aria-hidden />
          Templates
        </button>
      ) : null}
    </div>
  );
}
