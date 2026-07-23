import { query } from "./_generated/server";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isPhase5FlagEnabled } from "./phase5Controls";
import { parseInterestProfile } from "./userLearning";

/**
 * Optional personalization bundle — only when flag is on AND user consents
 * via privacyShareUsage (existing preference).
 */
export const getPersonalizationBundle = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase5FlagEnabled(ctx, "phase5.personalization"))) {
      return { enabled: false as const, consented: false };
    }
    const userId = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", userId))
      .first();
    let consented = true;
    try {
      const prefs = user?.userPreferences
        ? (JSON.parse(user.userPreferences) as { privacyShareUsage?: boolean })
        : null;
      if (prefs && prefs.privacyShareUsage === false) consented = false;
    } catch {
      consented = true;
    }
    if (!consented) {
      return {
        enabled: true as const,
        consented: false,
        message: "Personalization is off in your privacy settings.",
      };
    }

    const profile = parseInterestProfile(user?.interestProfile);
    const topics = (profile?.topics ?? []).slice(0, 6);
    return {
      enabled: true as const,
      consented: true,
      dailyBriefing:
        topics.length > 0
          ? `Today’s focus: ${topics.slice(0, 3).join(", ")}. Ask Giga3 to dive deeper.`
          : "Ask Giga3 anything — your interests will shape future tips when you keep personalization on.",
      feedHints: topics.map((t) => `Explore more about ${t}`),
      learningHints: [
        "Try a 10-minute practice quiz in GigaLearn",
        "Join a study community that matches your goals",
      ],
      creatorHints: ["Creators posting in your interest areas may appear more often."],
    };
  },
});
