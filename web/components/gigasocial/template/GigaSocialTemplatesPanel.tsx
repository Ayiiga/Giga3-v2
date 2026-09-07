"use client";

import { GigaTemplateButton } from "@/components/gigasocial/template/GigaTemplateButton";
import { GigaTemplateStudio } from "@/components/gigasocial/template/GigaTemplateStudio";
import { GigaSocialPostCard } from "@/components/gigasocial/GigaSocialPostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import type { GigaTemplateModeId } from "@/lib/gigasocial/templateMeta";
import { TEMPLATE_DISCOVER_CATEGORIES } from "@/lib/gigasocial/templateMeta";
import {
  buildTemplateHandoffFromPost,
  persistTemplateHandoff,
  templateStudioHref,
} from "@/lib/gigasocial/templateHandoff";
import type { SocialPost } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { LayoutTemplate, Search, Sparkles } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

export const GigaSocialTemplatesPanel = memo(function GigaSocialTemplatesPanel({
  sessionToken,
}: {
  sessionToken: string | null;
}) {
  const features = useGigaSocialFeatures();
  const [category, setCategory] = useState("trending");
  const [search, setSearch] = useState("");
  const [studioPost, setStudioPost] = useState<SocialPost | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const templates = useQuery(
    api.gigaSocialTemplates.listDiscoverableTemplates,
    features.enableUseAsTemplate
      ? {
          sessionToken: sessionToken ?? undefined,
          category: category === "trending" ? undefined : category,
          limit: 24,
        }
      : "skip"
  );

  const analysisQuery = useQuery(
    api.gigaSocialTemplates.getPostTemplateAnalysis,
    studioPost && sessionToken
      ? {
          sessionToken,
          postId: studioPost._id as Id<"socialPosts">,
        }
      : "skip"
  );

  const recordTemplateUse = useMutation(api.gigaSocialTemplates.recordTemplateUse);
  const toggleLike = useMutation(api.gigaSocial.toggleLike);
  const toggleBookmark = useMutation(api.gigaSocial.toggleBookmark);
  const recordShare = useMutation(api.gigaSocial.recordShare);

  const requireAuth = useCallback(() => {
    window.dispatchEvent(new CustomEvent("gigasocial:require-auth"));
  }, []);

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(({ post, analysis }) => {
      const haystack = `${post.body} @${post.author.handle} ${analysis.categories.join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [search, templates]);

  const handleStartTemplate = useCallback(
    async (mode: GigaTemplateModeId, userIdea: string) => {
      if (!sessionToken || !studioPost) {
        requireAuth();
        return;
      }
      setTemplateBusy(true);
      setTemplateError(null);
      try {
        await recordTemplateUse({
          sessionToken,
          postId: studioPost._id as Id<"socialPosts">,
          mode,
          userIdea,
        });
        const payload = buildTemplateHandoffFromPost(studioPost, mode, userIdea);
        persistTemplateHandoff(payload);
        setStudioPost(null);
        window.location.assign(templateStudioHref(payload));
      } catch (error) {
        setTemplateError(error instanceof Error ? error.message : "Could not start template.");
      } finally {
        setTemplateBusy(false);
      }
    },
    [recordTemplateUse, requireAuth, sessionToken, studioPost]
  );

  if (!features.enableUseAsTemplate) {
    return (
      <EmptyState
        icon={LayoutTemplate}
        title="Templates coming soon"
        description="Creative templates from GigaSocial posts will appear here."
      />
    );
  }

  if (templates === undefined) {
    return <LoadingState label="Loading templates…" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent p-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-lg">
            ✨
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Creative Templates</h2>
            <p className="mt-1 text-sm text-muted">
              Discover eligible GigaSocial posts and remix their structure with Giga3 AI — always
              original, never a blind copy.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TEMPLATE_DISCOVER_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCategory(item.id)}
            className={cn(
              "min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium",
              category === item.id
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border text-muted hover:border-accent/25"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search templates, creators, topics…"
          aria-label="Search templates"
          className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 text-sm"
        />
      </div>

      {filteredTemplates.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No templates yet"
          description="Creators can enable template use on their posts. Check back soon or browse the feed."
        />
      ) : (
        <ul className="space-y-4">
          {filteredTemplates.map(({ post, analysis, templateUseCount }) => (
            <li
              key={post._id}
              className="overflow-hidden rounded-2xl border border-border bg-white/90 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 px-3 py-2">
                <p className="text-xs text-muted">
                  {analysis.visualStyle}
                  {templateUseCount > 0 ? ` · ${templateUseCount} uses` : ""}
                </p>
                <GigaTemplateButton
                  disabled={!sessionToken}
                  onUseTemplate={() => {
                    if (!sessionToken) {
                      requireAuth();
                      return;
                    }
                    setTemplateError(null);
                    setStudioPost(post);
                  }}
                />
              </div>
              <GigaSocialPostCard
                post={post}
                sessionToken={sessionToken}
                enableUseAsTemplate={false}
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

      {studioPost ? (
        <GigaTemplateStudio
          open
          post={studioPost}
          availableModes={analysisQuery?.eligibility.availableModes ?? []}
          attributionLine={
            analysisQuery?.eligibility.attributionLine ??
            `Inspired by a GigaSocial template by @${studioPost.author.handle}.`
          }
          loading={templateBusy || analysisQuery === undefined}
          error={
            templateError ??
            (analysisQuery && !analysisQuery.eligibility.eligible
              ? analysisQuery.eligibility.reason ?? "Template use is not allowed."
              : null)
          }
          onClose={() => {
            setStudioPost(null);
            setTemplateError(null);
          }}
          onStart={handleStartTemplate}
        />
      ) : null}
    </div>
  );
});
