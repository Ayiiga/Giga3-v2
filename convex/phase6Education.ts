import { query } from "./_generated/server";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isPhase6FlagEnabled } from "./phase6Controls";
import { parseInterestProfile } from "./userLearning";

/** Education platform expansion — keeps GigaLearn / org classrooms intact. */
export const getEducationPlatformSummary = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase6FlagEnabled(ctx, "phase6.education"))) {
      return { enabled: false as const };
    }
    const userId = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", userId))
      .first();
    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(20);
    const profile = parseInterestProfile(user?.interestProfile);

    return {
      enabled: true as const,
      roles: {
        inOrganization: memberships.length > 0,
        orgRoles: memberships.map((m) => m.role),
      },
      learning: {
        streakDays: user?.learningStreakDays ?? 0,
        subjects: profile.education?.subjects ?? profile.topics.slice(0, 5),
        aiAssistedLearning: true,
      },
      resources: [
        { label: "GigaLearn studio", href: "/gigalearn/" },
        { label: "Enterprise / schools", href: "/enterprise/" },
        { label: "Study communities", href: "/gigasocial/" },
      ],
      assignmentSharingReady: true,
      progressTrackingReady: true,
    };
  },
});
