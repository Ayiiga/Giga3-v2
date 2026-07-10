"use client";

import { buildCreatorInsight } from "@/lib/gigasocial/aiAssistant";
import { formatCompactCount } from "@/lib/gigasocial/ogMeta";
import type { SocialPost, SocialProfileView } from "@/lib/gigasocial/types";
import { BarChart3, Sparkles, TrendingUp, Users } from "lucide-react";
import { memo, useMemo } from "react";

export const GigaSocialCreatorStudio = memo(function GigaSocialCreatorStudio({
  profile,
  posts,
}: {
  profile: SocialProfileView | null | undefined;
  posts: SocialPost[];
}) {
  const stats = useMemo(() => {
    const views = posts.reduce((sum, post) => sum + (post.viewCount ?? 0), 0);
    const likes = posts.reduce((sum, post) => sum + (post.likeCount ?? 0), 0);
    const shares = posts.reduce((sum, post) => sum + (post.shareCount ?? 0), 0);
    const comments = posts.reduce((sum, post) => sum + (post.commentCount ?? 0), 0);
    return { views, likes, shares, comments };
  }, [posts]);

  const insight = useMemo(
    () =>
      buildCreatorInsight(
        posts.map((post) => ({
          postType: post.postType,
          likeCount: post.likeCount,
          createdAt: post.createdAt,
        }))
      ),
    [posts]
  );

  return (
    <div className="gigasocial-creator-studio rounded-2xl border border-accent/15 bg-gradient-to-br from-violet-50/60 to-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-accent" aria-hidden />
        <h3 className="text-sm font-semibold text-foreground">Creator Studio</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={TrendingUp} label="Views" value={formatCompactCount(stats.views)} />
        <StatCard icon={Users} label="Posts" value={String(posts.length)} />
        <StatCard icon={Sparkles} label="Likes" value={formatCompactCount(stats.likes)} />
        <StatCard icon={BarChart3} label="Shares" value={formatCompactCount(stats.shares)} />
      </div>
      <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-muted">
        <span className="font-medium text-foreground">AI insight:</span> {insight}
      </p>
      <p className="mt-2 text-xs text-muted">
        {formatCompactCount(stats.comments)} comments across your recent posts
      </p>
      {profile?.gamification ? (
        <p className="mt-2 text-xs text-muted">
          Level {profile.gamification.level} · {profile.gamification.xp} XP ·{" "}
          {profile.gamification.streakDays} day streak
        </p>
      ) : null}
    </div>
  );
});

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
