import { query } from "./_generated/server";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isPhase5FlagEnabled } from "./phase5Controls";
import { parseInterestProfile } from "./userLearning";

/**
 * Education expansion bundle — links existing GigaLearn / org classrooms
 * without replacing them. Flag-gated.
 */
export const getEducationExpansion = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase5FlagEnabled(ctx, "phase5.education"))) {
      return { enabled: false as const };
    }
    const userId = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", userId))
      .first();
    const profile = parseInterestProfile(user?.interestProfile);
    const subjects = profile.education?.subjects?.slice(0, 6) ?? profile.topics.slice(0, 4);

    return {
      enabled: true as const,
      studyPlanner: {
        title: "AI study planner",
        steps: [
          "Pick one subject for today",
          "Ask Giga3 for a 20-minute practice set",
          "Review mistakes and save a note in GigaLearn",
        ],
      },
      practiceQuizHint:
        subjects.length > 0
          ? `Practice quiz idea: ${subjects[0]} fundamentals`
          : "Open GigaLearn to start a practice quiz",
      communities: [
        { slug: "students", label: "Student community", href: "/gigasocial/" },
        { slug: "teachers", label: "Teacher community", href: "/gigasocial/" },
        { slug: "study-groups", label: "Study groups", href: "/gigalearn/" },
      ],
      progress: {
        learningStreakDays: user?.learningStreakDays ?? 0,
        interestTopics: subjects,
      },
      links: {
        gigalearn: "/gigalearn/",
        enterprise: "/enterprise/",
      },
    };
  },
});
