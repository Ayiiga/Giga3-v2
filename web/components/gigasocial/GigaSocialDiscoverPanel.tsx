"use client";

import { SocialPostGrid } from "./SocialPostGrid";
import { GigaSocialPostCard } from "./GigaSocialPostCard";
import type { Id } from "convex/_generated/dataModel";
import { GigaSocialTemplatesPanel } from "@/components/gigasocial/template/GigaSocialTemplatesPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { DISCOVER_FILTERS, type DiscoverFilterId } from "@/lib/gigasocial/sections";
import type { SocialPost } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { LayoutTemplate, Search } from "lucide-react";
import { memo, useEffect, useState } from "react";

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

  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const data = useQuery(
    api.gigaSocial.listDiscover,
    view === "posts"
      ? {
          sessionToken: sessionToken ?? undefined,
          filter,
          query: search || undefined,
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


  const posts = (data?.posts ?? []) as SocialPost[];

  const creators = Array.from(new Map(posts.map(post => [post.author.handle, post.author])).values()).slice(0, 8);
  const hashtags = Array.from(new Set(posts.flatMap(post => post.hashtags ?? []))).slice(0, 8);

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
            aria-pressed={filter === f.id}
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

      {creators.length > 0 && <section aria-label="Creators in these results">
        <h3 className="mb-2 font-bold">Discover creators</h3>
        <div className="creator-strip">{creators.map(author => (
          <a key={author.handle} href={`/gigasocial/profile/?handle=${encodeURIComponent(author.handle)}`}>
            {author.avatarUrl ? <img src={author.avatarUrl} alt="" width="48" height="48" /> : <b>{author.displayName.slice(0, 1)}</b>}
            <small>{author.displayName}</small>
          </a>
        ))}</div>
      </section>}
      {hashtags.length > 0 && <div aria-label="Explore hashtags" className="flex gap-2 overflow-x-auto">{hashtags.map(tag =>
        <button type="button" key={tag} className="min-h-11 shrink-0 rounded-full border px-3" onClick={() => setQuery("#" + tag.replace(/^#/, ""))}>#{tag.replace(/^#/, "")}</button>
      )}</div>}
      {data === undefined ? <LoadingState label="Discovering posts…" /> : posts.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results"
          description="Try another filter or search term."
        />
      ) : (
        <SocialPostGrid posts={posts} renderPost={post => (
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
        )} />
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
