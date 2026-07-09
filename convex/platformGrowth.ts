import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { parseInterestProfile } from "./userLearning";
import { todayKey } from "./creditsConfig";

const ACHIEVEMENT_DEFS: Record<
  string,
  { label: string; description: string; check: (ctx: AchievementContext) => boolean }
> = {
  first_chat: {
    label: "First conversation",
    description: "Started your first Giga3 chat",
    check: (c) => c.conversationCount >= 1,
  },
  streak_3: {
    label: "3-day streak",
    description: "Used Giga3 three days in a row",
    check: (c) => c.streakDays >= 3,
  },
  streak_7: {
    label: "Week warrior",
    description: "Seven-day learning streak",
    check: (c) => c.streakDays >= 7,
  },
  creator_start: {
    label: "Creator spark",
    description: "Explored Creator Studio",
    check: (c) => c.role === "creator" || c.hasMediaJob,
  },
  referrer: {
    label: "Community builder",
    description: "Referred a friend to Giga3",
    check: (c) => c.referralCount >= 1,
  },
};

type AchievementContext = {
  conversationCount: number;
  streakDays: number;
  role: string;
  hasMediaJob: boolean;
  referralCount: number;
};

export const getReferralInfo = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return null;

    const referrals = await ctx.db
      .query("referralEvents")
      .withIndex("by_referrer", (q) => q.eq("referrerUserId", email))
      .take(100);

    return {
      referralCode: user.referralCode ?? null,
      referralCount: referrals.length,
      totalRewardCredits: referrals.reduce((s, r) => s + r.rewardCredits, 0),
    };
  },
});

export const applyReferralCode = mutation({
  args: {
    ...sessionArgs,
    referralCode: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const code = args.referralCode.trim().toUpperCase();
    if (!code) throw new Error("Invalid code");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new Error("User not found");
    if (user.referredByUserId) throw new Error("Referral already applied");

    const referrer = await ctx.db
      .query("users")
      .withIndex("by_referralCode", (q) => q.eq("referralCode", code))
      .first();
    if (!referrer || referrer.email === email) {
      throw new Error("Referral code not found");
    }

    const existing = await ctx.db
      .query("referralEvents")
      .withIndex("by_referred", (q) => q.eq("referredUserId", email))
      .first();
    if (existing) throw new Error("Referral already recorded");

    const rewardCredits = 5;
    await ctx.db.patch(user._id, {
      referredByUserId: referrer.email,
      credits: user.credits + rewardCredits,
    });

    await ctx.db.insert("referralEvents", {
      referrerUserId: referrer.email,
      referredUserId: email,
      referralCode: code,
      rewardCredits,
      createdAt: Date.now(),
    });

    return { rewardCredits };
  },
});

export const listAchievements = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    return await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .order("desc")
      .take(50);
  },
});

export const syncAchievements = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { earned: [] as string[] };

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user_updated", (q) => q.eq("userId", email))
      .order("desc")
      .take(5);

    const mediaJobs = await ctx.db
      .query("mediaJobs")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .take(1);

    const referrals = await ctx.db
      .query("referralEvents")
      .withIndex("by_referrer", (q) => q.eq("referrerUserId", email))
      .take(1);

    const ctx_: AchievementContext = {
      conversationCount: conversations.length,
      streakDays: user.learningStreakDays ?? 0,
      role: user.userRole ?? "general",
      hasMediaJob: mediaJobs.length > 0,
      referralCount: referrals.length,
    };

    const existing = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .take(50);
    const earnedIds = new Set(existing.map((a) => a.badgeId));
    const newlyEarned: string[] = [];

    for (const [badgeId, def] of Object.entries(ACHIEVEMENT_DEFS)) {
      if (earnedIds.has(badgeId)) continue;
      if (!def.check(ctx_)) continue;
      await ctx.db.insert("userAchievements", {
        userId: email,
        badgeId,
        label: def.label,
        description: def.description,
        earnedAt: Date.now(),
      });
      newlyEarned.push(badgeId);
    }

    return { earned: newlyEarned };
  },
});

export const getRecommendations = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { items: [] };

    const role = user.userRole ?? "general";
    const interests = parseInterestProfile(user.interestProfile);
    const prefs = user.userPreferences ? JSON.parse(user.userPreferences) : null;
    const hour = new Date().getHours();

    const items: {
      id: string;
      title: string;
      description: string;
      href: string;
      kind: string;
    }[] = [];

    const roleTools: Record<string, { title: string; href: string; description: string }[]> = {
      student: [
        { title: "GigaLearn", href: "/gigalearn", description: "Study plans and homework help" },
        { title: "Research mode", href: "/chat?mode=research", description: "Deep research assistance" },
      ],
      teacher: [
        { title: "Enterprise workspace", href: "/workspace", description: "Classes and assignments" },
        { title: "Creator Studio", href: "/creator-studio", description: "Lesson materials" },
      ],
      creator: [
        { title: "Media Studio", href: "/media", description: "AI image generation" },
        { title: "Marketplace", href: "/marketplace/sell", description: "Sell your work" },
      ],
      business: [
        { title: "Automation", href: "/automation", description: "Workflows and agents" },
        { title: "Enterprise", href: "/enterprise", description: "Team deployments" },
      ],
      developer: [
        { title: "Coding chat", href: "/chat?mode=coding", description: "Technical assistance" },
        { title: "Automation", href: "/automation", description: "Build AI workflows" },
      ],
      general: [
        { title: "Start chatting", href: "/chat", description: "Your AI assistant" },
        { title: "Explore tools", href: "/#features", description: "Discover Giga3 features" },
      ],
    };

    for (const tool of roleTools[role] ?? roleTools.general) {
      items.push({ id: tool.href, ...tool, kind: "tool" });
    }

    if (interests.topics?.length) {
      items.push({
        id: "interest-chat",
        title: `Continue learning: ${interests.topics[0]}`,
        description: "Personalized from your chat history",
        href: "/chat",
        kind: "learning",
      });
    }

    if (hour >= 6 && hour < 12) {
      items.push({
        id: "morning-goal",
        title: "Set today's goal",
        description: "Start your day with a focused AI session",
        href: "/chat",
        kind: "goal",
      });
    }

    if (prefs?.favoriteTools?.length) {
      for (const toolId of prefs.favoriteTools.slice(0, 3)) {
        items.push({
          id: `fav-${toolId}`,
          title: `Open ${toolId}`,
          description: "One of your favorite tools",
          href: toolId.startsWith("/") ? toolId : `/chat`,
          kind: "favorite",
        });
      }
    }

    return { items: items.slice(0, 8) };
  },
});

export const getHomeDashboard = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return null;

    const today = todayKey();
    const usageToday = await ctx.db
      .query("usageDaily")
      .withIndex("by_user_date", (q) => q.eq("userId", email).eq("dateKey", today))
      .first();

    const recentChats = await ctx.db
      .query("conversations")
      .withIndex("by_user_updated", (q) => q.eq("userId", email))
      .order("desc")
      .take(5);

    const achievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .order("desc")
      .take(5);

    const aiEventsToday = await ctx.db
      .query("aiUsageEvents")
      .withIndex("by_user_created", (q) => q.eq("userId", email))
      .order("desc")
      .take(50);
    const todayAiCount = aiEventsToday.filter((e) => e.dateKey === today).length;

    return {
      role: user.userRole ?? "general",
      credits: user.credits,
      streakDays: user.learningStreakDays ?? 0,
      todayUsage: {
        chats: usageToday?.chatsUsed ?? 0,
        images: usageToday?.imagesUsed ?? 0,
        aiRequests: todayAiCount,
      },
      dailyGoal: 5,
      recentChats: recentChats.map((c) => ({
        id: c._id,
        title: c.title,
        mode: c.mode,
        updatedAt: c.updatedAt,
      })),
      achievements: achievements.map((a) => ({
        badgeId: a.badgeId,
        label: a.label,
        earnedAt: a.earnedAt,
      })),
      continueChat: recentChats[0]
        ? { id: recentChats[0]._id, title: recentChats[0].title }
        : null,
    };
  },
});
