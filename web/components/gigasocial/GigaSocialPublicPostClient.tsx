"use client";

import { GigaSocialPostMedia } from "@/components/gigasocial/GigaSocialPostMedia";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ButtonLink } from "@/components/ui/Button";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { renderCaptionWithHashtags } from "@/lib/gigasocial/hashtags";
import { buildGigaSocialFeedPostUrl } from "@/lib/gigasocial/shareLinks";
import { splitPostDisplay } from "@/lib/gigasocial/postDisplay";
import { formatCompactCount, formatVideoDuration } from "@/lib/gigasocial/ogMeta";
import type { SocialPost } from "@/lib/gigasocial/types";
import { formatRelativeTime } from "@/lib/datetime";
import { siteConfig } from "@/lib/site";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ExternalLink, UsersRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef } from "react";

function PublicPostInner() {
  const params = useSearchParams();
  const postId = params.get("id")?.trim() ?? "";
  const viewedRef = useRef(false);

  const post = useQuery(
    api.gigaSocial.getPublicPost,
    postId ? { postId: postId as Id<"socialPosts"> } : "skip"
  );
  const recordView = useMutation(api.gigaSocial.recordPostView);

  const display = useMemo(
    () => (post ? splitPostDisplay(post.body) : null),
    [post]
  );
  const captionParts = useMemo(
    () => (display ? renderCaptionWithHashtags(display.description) : []),
    [display]
  );

  useEffect(() => {
    if (!post || viewedRef.current || !postId) return;
    viewedRef.current = true;
    void recordView({ postId: postId as Id<"socialPosts"> });
  }, [post, postId, recordView]);

  useEffect(() => {
    if (!post) return;
    const displayParts = splitPostDisplay(post.body);
    const label = displayParts.title || displayParts.description.slice(0, 60);
    const views = post.viewCount ?? 0;
    const likes = post.likeCount ?? 0;
    const stats = `${formatCompactCount(views)} views • ${formatCompactCount(likes)} likes`;
    document.title = label
      ? `${stats} | ${post.author.displayName}: ${label} | GigaSocial`
      : `${stats} | ${post.author.displayName} on GigaSocial | Giga3 AI`;
  }, [post]);

  if (!postId) {
    return (
      <ShareState
        title="Missing post link"
        body="This URL is incomplete. Ask the sender for a valid GigaSocial post link."
      />
    );
  }

  if (post === undefined) {
    return (
      <ShareState
        title="Loading post…"
        body="Please wait while we load this GigaSocial post."
      />
    );
  }

  if (post === null) {
    return (
      <ShareState
        title="Post unavailable"
        body="This post was removed or is not publicly available."
      />
    );
  }

  const feedUrl = buildGigaSocialFeedPostUrl(post._id);
  const durationLabel = formatVideoDuration(post.videoDurationSec);
  const views = post.viewCount ?? 0;
  const likes = post.likeCount ?? 0;

  return (
    <div className="marketing-stable mx-auto max-w-2xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <BrandLogo size={28} className="!h-7 !w-7" />
          {siteConfig.name}
        </Link>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted">
          <UsersRound className="h-4 w-4" aria-hidden />
          GigaSocial
        </span>
      </header>

      <article className="saas-card rounded-2xl border border-border p-4 sm:p-6">
        <header className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
            {post.author.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{post.author.displayName}</p>
            <p className="text-xs text-muted">
              @{post.author.handle} · {formatRelativeTime(post.createdAt)}
            </p>
          </div>
        </header>

        {display?.title ? (
          <>
            <h1 className="gigasocial-post-title mt-4 text-xl font-semibold">{display.title}</h1>
            {display.description ? (
              <p className="gigasocial-post-description mt-2 whitespace-pre-wrap text-sm">
                {captionParts.map((part, index) =>
                  part.type === "hashtag" ? (
                    <span key={`${part.value}-${index}`} className="text-accent">
                      {part.value}
                    </span>
                  ) : (
                    <span key={`${part.value}-${index}`}>{part.value}</span>
                  )
                )}
              </p>
            ) : null}
          </>
        ) : (
          <p className="gigasocial-post-description mt-4 whitespace-pre-wrap text-sm">
            {captionParts.map((part, index) =>
              part.type === "hashtag" ? (
                <span key={`${part.value}-${index}`} className="text-accent">
                  {part.value}
                </span>
              ) : (
                <span key={`${part.value}-${index}`}>{part.value}</span>
              )
            )}
          </p>
        )}

        <GigaSocialPostMedia post={post as SocialPost} />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted">
          <p>
            {formatCompactCount(views)} views · {formatCompactCount(likes)} likes
            {durationLabel ? ` · ${durationLabel}` : ""}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <UsersRound className="h-3.5 w-3.5" aria-hidden />
            {siteConfig.url.replace(/^https?:\/\//, "")}
          </p>
        </div>
      </article>

      <div className="saas-card rounded-2xl border border-accent/20 bg-accent/5 p-4 sm:p-5">
        <p className="text-sm font-medium text-foreground">
          See more on GigaSocial — the Giga3 AI community feed
        </p>
        <p className="mt-1 text-sm text-muted">
          Connect, share videos, learn, and collaborate with creators across Africa.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink href={feedUrl} className="min-h-11">
            <ExternalLink className="h-4 w-4" aria-hidden />
            View on GigaSocial
          </ButtonLink>
          <ButtonLink href={siteConfig.links.gigasocial} variant="outline" className="min-h-11">
            Open GigaSocial feed
          </ButtonLink>
          <ButtonLink href="/chat/login" variant="outline" className="min-h-11">
            Try Giga3 AI
          </ButtonLink>
        </div>
      </div>

      <p className="text-center text-xs text-muted">
        Shared from GigaSocial on {siteConfig.name} · {siteConfig.url.replace(/^https?:\/\//, "")}
      </p>
    </div>
  );
}

function ShareState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="max-w-md text-sm text-muted">{body}</p>
      <ButtonLink href={siteConfig.links.gigasocial} className="mt-2 min-h-11">
        Go to GigaSocial
      </ButtonLink>
    </div>
  );
}

export function GigaSocialPublicPostRoot() {
  return (
    <ConvexAppShell>
      <Suspense
        fallback={
          <ShareState title="Loading…" body="Preparing GigaSocial post." />
        }
      >
        <PublicPostInner />
      </Suspense>
    </ConvexAppShell>
  );
}
