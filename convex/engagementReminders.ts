import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { ageCategoryFromAttestation } from "./childSafetyPolicy";
import { resolveInterestSegment, type FeatureEmailCopy } from "./engagementAnnouncementSafety";
import { ENGAGEMENT_CHECKLIST_IDS, ENGAGEMENT_FLAG_DEFAULTS } from "./engagementControls";
import { isMonetizationUnlocked } from "./gigaSocialEconomy";
import { parseInterestProfile } from "./userLearning";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export type EngagementReminder = FeatureEmailCopy & {
  key: string;
  category: "learning" | "creator" | "announcement";
};

export async function engagementRemindersEnabled(ctx: Pick<QueryCtx, "db">) {
  const [setting, killSwitch] = await Promise.all(
    ["engagement.communication_reminders", "engagement.kill_switch"].map((key) =>
      ctx.db.query("remoteConfigEntries").withIndex("by_key", (q) => q.eq("key", key)).first()
    )
  );
  const enabled = setting?.enabled ?? ENGAGEMENT_FLAG_DEFAULTS["engagement.communication_reminders"].enabled;
  return enabled && killSwitch?.enabled !== true;
}

export async function getEngagementReminders(
  ctx: Pick<QueryCtx, "db">,
  user: Doc<"users">,
  now: number
): Promise<EngagementReminder[]> {
  const reminders: EngagementReminder[] = [];
  const interests = parseInterestProfile(user.interestProfile);
  const onboarding = readOnboarding(user.onboardingState);
  const selectedInterests = Array.isArray(onboarding?.interests)
    ? onboarding.interests.filter((item): item is string => typeof item === "string")
    : [];
  const topics = [...interests.topics, ...selectedInterests];
  const learningInterest =
    topics.includes("teaching") || resolveInterestSegment(topics, user.userRole) === "learn";
  const isAdult = ageCategoryFromAttestation(user, now) === "adult";
  const [activeCourse, profiles] = await Promise.all([
    ctx.db.query("gigaLearnAcademyEnrolments")
      .withIndex("by_user_status", (q) => q.eq("userId", user.email).eq("status", "active"))
      .filter((q) => q.and(
        q.lt(q.field("progressPercent"), 100),
        q.lte(q.field("updatedAt"), now - THREE_DAYS_MS)
      ))
      .first(),
    isAdult
      ? ctx.db.query("socialProfiles").withIndex("by_user", (q) => q.eq("userId", user.email)).take(3)
      : Promise.resolve([]),
  ]);

  if (activeCourse) {
    reminders.push({
      key: `course-${activeCourse._id}-${activeCourse.updatedAt}`,
      category: "learning",
      title: "Continue your GigaLearn course",
      lead: "You have an unfinished course in GigaLearn Academy. Pick up from your saved progress when you have time.",
      ctaLabel: "Resume your course",
      ctaPath: `/gigalearn/academy/course/?slug=${encodeURIComponent(activeCourse.courseSlug)}`,
      bullets: ["Open your course and choose the next lesson in your pathway."],
      subjectLine: "Your GigaLearn course is ready to resume",
    });
  }

  const completedAt = ENGAGEMENT_CHECKLIST_IDS
    .map((id) => onboarding?.checklistCompleted?.[id])
    .filter((time): time is number => typeof time === "number" && Number.isFinite(time));
  if (
    !onboarding?.checklistDismissedAt &&
    completedAt.length > 0 &&
    completedAt.length < ENGAGEMENT_CHECKLIST_IDS.length &&
    Math.max(...completedAt) <= now - THREE_DAYS_MS
  ) {
    reminders.push({
      key: "finish-getting-started",
      category: "announcement",
      title: "Finish getting started with Giga3 AI",
      lead: "You have steps left in your Getting started checklist. Return to Giga3 AI to continue where you left off.",
      ctaLabel: "Open Giga3 AI",
      ctaPath: "/home/",
      bullets: ["Complete the remaining steps from your Getting started checklist."],
      subjectLine: "Pick up where you left off on Giga3 AI",
    });
  }

  const profile = profiles.find((profile) => profile.isMain) ?? profiles[0];
  if (profile && !(await isMonetizationUnlocked(ctx, profile))) {
    reminders.push({
      key: "creator-monetisation",
      category: "creator",
      title: "Check your creator monetisation progress",
      lead: "Your GigaSocial Earnings Centre shows your current fan and post requirements and the next steps for creator monetisation.",
      ctaLabel: "Open Earnings Centre",
      ctaPath: "/gigasocial/?tab=creator&creatorTab=earnings",
      bullets: [
        "Check which posts count toward eligibility and review the creator terms when available.",
        "Explore gifts, tips and affiliate commissions on qualifying referrals.",
        "Check withdrawal requirements and eligible earnings in your account.",
      ],
      subjectLine: "Your next step toward earning on GigaSocial",
    });
  } else if (isAdult && (profile || topics.includes("social") || topics.includes("content_creation"))) {
    reminders.push({
      key: "earnings-guide",
      category: "creator",
      title: "Explore ways to earn on GigaSocial",
      lead: "Find out how gifts, tips and qualifying affiliate referrals work, and where to check creator earnings.",
      ctaLabel: "Explore Creator Earnings",
      ctaPath: "/gigasocial/earnings/",
      bullets: ["Review current eligibility and payment requirements in the Earnings Centre."],
      subjectLine: "How earning on GigaSocial works",
    });
  }

  const hasEnrolled = activeCourse || (learningInterest && await ctx.db.query("gigaLearnAcademyEnrolments")
    .withIndex("by_user", (q) => q.eq("userId", user.email))
    .first());

  if (learningInterest && !hasEnrolled) {
    reminders.push({
      key: "academy-discovery",
      category: "learning",
      title: "Explore GigaLearn Academy",
      lead: "Try a structured course in GigaLearn Academy and work through its lessons at your own pace.",
      ctaLabel: "Browse Academy courses",
      ctaPath: "/gigalearn/academy/courses/",
      bullets: ["Browse the catalogue and choose a course that fits your goal."],
      subjectLine: "Find a course to try in GigaLearn Academy",
    });
  }

  return reminders;
}

function readOnboarding(raw: string | undefined): {
  interests?: unknown;
  checklistCompleted?: Record<string, unknown>;
  checklistDismissedAt?: number;
} | null {
  try {
    return JSON.parse(raw ?? "null");
  } catch {
    return null;
  }
}
