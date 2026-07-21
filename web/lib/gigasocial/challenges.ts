/** Creator challenges — client catalog + scoring helpers (leaderboard display). */

export type ChallengeId =
  | "best-comedy"
  | "best-education"
  | "best-football"
  | "best-photography"
  | "best-student"
  | "best-teacher"
  | "best-church"
  | "best-ai-tutorial";

export type ChallengeDef = {
  id: ChallengeId;
  title: string;
  emoji: string;
  description: string;
  hashtags: string[];
};

export const CREATOR_CHALLENGES: ChallengeDef[] = [
  {
    id: "best-comedy",
    title: "Best Comedy",
    emoji: "😂",
    description: "Skits and humorous shorts that make Africa smile.",
    hashtags: ["comedy", "skit", "funny"],
  },
  {
    id: "best-education",
    title: "Best Educational Video",
    emoji: "📚",
    description: "Clear lessons anyone can learn from.",
    hashtags: ["education", "learn", "tutorial"],
  },
  {
    id: "best-football",
    title: "Best Football Analysis",
    emoji: "⚽",
    description: "Match breakdowns, tactics, and fan insights.",
    hashtags: ["football", "soccer", "afcon"],
  },
  {
    id: "best-photography",
    title: "Best Photography",
    emoji: "📷",
    description: "Stunning stills from everyday life and nature.",
    hashtags: ["photography", "photo", "visual"],
  },
  {
    id: "best-student",
    title: "Best Student Creator",
    emoji: "🎓",
    description: "Campus voices and student-made content.",
    hashtags: ["student", "campus", "university"],
  },
  {
    id: "best-teacher",
    title: "Best Teacher",
    emoji: "🍎",
    description: "Educators sharing classroom magic.",
    hashtags: ["teacher", "lesson", "classroom"],
  },
  {
    id: "best-church",
    title: "Best Church Content",
    emoji: "⛪",
    description: "Worship, sermons, and faith community stories.",
    hashtags: ["church", "gospel", "faith"],
  },
  {
    id: "best-ai-tutorial",
    title: "Best AI Tutorial",
    emoji: "🤖",
    description: "Practical AI how-tos for African creators.",
    hashtags: ["ai", "giga3", "tutorial"],
  },
];

export type ChallengeScoreInput = {
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  viewCount?: number;
  hashtags?: string[];
  body?: string;
};

export function scoreForChallenge(challenge: ChallengeDef, post: ChallengeScoreInput): number {
  const hay = `${post.body ?? ""} ${(post.hashtags ?? []).join(" ")}`.toLowerCase();
  const tagHit = challenge.hashtags.some((tag) => hay.includes(tag));
  if (!tagHit) return 0;
  return (
    (post.likeCount ?? 0) * 3 +
    (post.commentCount ?? 0) * 4 +
    (post.shareCount ?? 0) * 5 +
    (post.viewCount ?? 0) * 0.05 +
    10
  );
}

export function rankChallengeLeaderboard(
  challenge: ChallengeDef,
  posts: (ChallengeScoreInput & { id: string; authorHandle?: string })[]
): { id: string; authorHandle?: string; score: number }[] {
  return posts
    .map((post) => ({
      id: post.id,
      authorHandle: post.authorHandle,
      score: scoreForChallenge(challenge, post),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
