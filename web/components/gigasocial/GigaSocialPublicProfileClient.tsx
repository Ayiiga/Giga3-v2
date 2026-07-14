"use client";

import { GigaSocialAvatarFollow } from "@/components/gigasocial/GigaSocialAvatarFollow";
import { GigaSocialPostCard } from "@/components/gigasocial/GigaSocialPostCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { getSessionToken } from "@/lib/auth";
import { BADGE_LABELS } from "@/lib/gigasocial/sections";
import { buildGigaSocialProfileUrl } from "@/lib/gigasocial/shareLinks";
import { parseProfileHandle } from "@/lib/gigasocial/profileRoute";
import type { SocialPost } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Award, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { memo, useEffect, useMemo, useState } from "react";
import type { SocialPostTypeId } from "@/lib/gigasocial/sections";

type ProfileTab = "posts" | "photos" | "videos" | "ai" | "liked";

function profileCoverGradient(handle: string): string {
  let hash = 0;
  for (let i = 0; i < handle.length; i += 1) {
    hash = handle.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 55% 42%) 0%, hsl(${hue2} 60% 28%) 100%)`;
}

export const GigaSocialPublicProfileClient = memo(function GigaSocialPublicProfileClient({
  handle,
}: {
  handle: string;
}) {
  const [sessionToken] = useState(() => getSessionToken());
  const [tab, setTab] = useState<ProfileTab>("posts");
  const [fanCount, setFanCount] = useState<number | null>(null);

  const data = useQuery(api.gigaSocial.getProfileByHandle, {
    handle,
    sessionToken: sessionToken ?? undefined,
  });

  const toggleLike = useMutation(api.gigaSocial.toggleLike);
  const toggleBookmark = useMutation(api.gigaSocial.toggleBookmark);
  const recordShare = useMutation(api.gigaSocial.recordShare);

  const profile = data?.profile;
  const posts = useMemo(() => (data?.posts ?? []) as SocialPost[], [data?.posts]);

  const filteredPosts = useMemo(() => {
    switch (tab) {
      case "photos":
        return posts.filter(
          (p) => p.mediaType === "image" || p.mediaType === "gallery" || p.postType === "image"
        );
      case "videos":
        return posts.filter((p) => p.mediaType === "video" || p.postType === "video");
      case "ai":
        return posts.filter((p) => p.postType === "ai");
      case "liked":
        return posts.filter((p) => p.likedByMe);
      default:
        return posts;
    }
  }, [posts, tab]);

  if (data === undefined) {
    return <LoadingState label="Loading profile…" />;
  }

  if (!profile) {
    return (
      <div className="saas-card rounded-2xl border border-border p-8 text-center">
        <p className="text-sm text-muted">Profile not found.</p>
        <Link href="/gigasocial/" className="mt-4 inline-block text-sm text-accent hover:underline">
          Back to GigaSocial
        </Link>
      </div>
    );
  }

  const displayFanCount = fanCount ?? profile.fanCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="saas-card overflow-hidden rounded-2xl border border-border">
        <div
          className="h-32 w-full sm:h-40"
          style={{ background: profileCoverGradient(profile.handle) }}
          role="img"
          aria-label={`${profile.displayName} cover`}
        />
        <div className="relative px-4 pb-4 sm:px-6">
          <div className="-mt-12">
            <GigaSocialAvatarFollow
              displayName={profile.displayName}
              handle={profile.handle}
              avatarUrl={profile.avatarUrl}
              avatarSize="xl"
              creatorId={profile.userId}
              sessionToken={sessionToken}
              supporting={profile.supporting}
              avatarClassName="ring-4 ring-card"
              onFollowChange={(newSupporting) => {
                setFanCount((c) => {
                  const base = c ?? profile.fanCount ?? 0;
                  return newSupporting ? base + 1 : Math.max(0, base - 1);
                });
              }}
            />
          </div>

          <div className="mt-3">
            <h1 className="text-xl font-bold text-foreground">{profile.displayName}</h1>
            <p className="text-sm text-muted">@{profile.handle}</p>
            {profile.bio ? <p className="mt-2 text-sm text-foreground">{profile.bio}</p> : null}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted">Posts</dt>
              <dd className="font-semibold">{profile.postCount ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted">Followers</dt>
              <dd className="font-semibold">{displayFanCount}</dd>
            </div>
            <div>
              <dt className="text-muted">Following</dt>
              <dd className="font-semibold">{profile.supportingCount ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted">Likes received</dt>
              <dd className="font-semibold">{profile.likesReceived ?? 0}</dd>
            </div>
          </dl>

          {profile.gamification?.badges?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.gamification.badges.slice(0, 6).map((badge) => (
                <span
                  key={badge.id}
                  className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
                >
                  <Award className="h-3.5 w-3.5" aria-hidden />
                  {BADGE_LABELS[badge.id as keyof typeof BADGE_LABELS] ?? badge.label}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/creator/?handle=${encodeURIComponent(profile.handle)}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium hover:bg-accent/5"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Marketplace
            </Link>
          </div>
        </div>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto overscroll-x-contain pb-1"
        aria-label="Profile content"
      >
        {(
          [
            ["posts", "Posts"],
            ["photos", "Photos"],
            ["videos", "Videos"],
            ["ai", "AI"],
            ["liked", "Liked"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium",
              tab === id
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border bg-white text-muted"
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {filteredPosts.length === 0 ? (
        <p className="text-center text-sm text-muted">No {tab} to show yet.</p>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <GigaSocialPostCard
              key={post._id}
              post={post}
              sessionToken={sessionToken}
              onLike={async (postId) => {
                if (!sessionToken) return;
                await toggleLike({ sessionToken, postId: postId as Id<"socialPosts"> });
              }}
              onBookmark={async (postId) => {
                if (!sessionToken) return;
                await toggleBookmark({ sessionToken, postId: postId as Id<"socialPosts"> });
              }}
              onShare={async (postId) => {
                if (!sessionToken) return;
                await recordShare({ sessionToken, postId: postId as Id<"socialPosts"> });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export function GigaSocialPublicProfileRoot() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sessionToken] = useState(() => getSessionToken());

  const handle = useMemo(
    () => parseProfileHandle(pathname, searchParams.toString()),
    [pathname, searchParams]
  );

  const myProfile = useQuery(
    api.gigaSocial.getMyProfile,
    !handle && sessionToken ? { sessionToken } : "skip"
  );

  useEffect(() => {
    if (handle || !myProfile?.profile?.handle) return;
    router.replace(buildGigaSocialProfileUrl(myProfile.profile.handle));
  }, [handle, myProfile?.profile?.handle, router]);

  if (!handle) {
    if (sessionToken && myProfile === undefined) {
      return <LoadingState label="Loading profile…" />;
    }
    if (sessionToken && myProfile?.profile?.handle) {
      return <LoadingState label="Opening your profile…" />;
    }
    return (
      <div className="saas-card rounded-2xl border border-border p-8 text-center">
        <p className="text-sm text-muted">
          Enter a creator handle to view their public profile.
        </p>
        <Link href="/gigasocial/" className="mt-4 inline-block text-sm text-accent hover:underline">
          Browse GigaSocial
        </Link>
      </div>
    );
  }

  return <GigaSocialPublicProfileClient handle={handle} />;
}
