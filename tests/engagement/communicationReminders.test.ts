/** @vitest-environment edge-runtime */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { internal } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.*s");
const fourDays = 4 * 24 * 60 * 60 * 1000;

async function seedLearner(
  t: ReturnType<typeof convexTest>,
  email: string,
  prefs: Partial<Doc<"users">> = {}
) {
  return t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email,
      tokens: 0,
      plan: "free",
      tier: "free",
      subscriptionPlan: "free",
      credits: 25,
      starterCreditsGranted: true,
      onboardingState: JSON.stringify({ interests: ["learning"] }),
      emailVerificationTime: Date.now(),
      ...prefs,
    });
  });
}

async function setFlag(t: ReturnType<typeof convexTest>, key: string, enabled: boolean) {
  await t.run(async (ctx) => {
    await ctx.db.insert("remoteConfigEntries", {
      key,
      value: enabled ? "enabled" : "disabled",
      enabled,
      rolloutPercent: 0,
      updatedAt: Date.now(),
    });
  });
}

describe("communication reminders", () => {
  it("uses recorded course progress for email and skips a completed course", async () => {
    const t = convexTest(schema, modules);
    const email = "learner@example.com";
    await seedLearner(t, email, { emailEngagementOptIn: true });
    const enrolmentId = await t.run((ctx) => ctx.db.insert("gigaLearnAcademyEnrolments", {
      userId: email,
      courseSlug: "exam-bece-prep",
      status: "active",
      progressPercent: 25,
      enrolledAt: Date.now() - fourDays,
      updatedAt: Date.now() - fourDays,
    }));

    const prepared = await t.mutation(internal.engagementEmail.prepareDigestRecipientInternal, { email });
    expect(prepared?.reminder?.ctaPath).toBe("/gigalearn/academy/course/?slug=exam-bece-prep");
    await t.run((ctx) => ctx.db.patch(enrolmentId, { status: "completed", progressPercent: 100 }));
    const refreshed = await t.mutation(internal.engagementEmail.prepareDigestRecipientInternal, { email });
    expect(refreshed?.reminder).toBeUndefined();
  });

  it("honours explicit email consent, the kill switch, and prior email delivery", async () => {
    const t = convexTest(schema, modules);
    const optedIn = "optin@example.com";
    const legacy = "legacy@example.com";
    const optedOut = "optout@example.com";
    await seedLearner(t, optedIn, { emailEngagementOptIn: true });
    await seedLearner(t, legacy);
    await seedLearner(t, optedOut, { emailEngagementOptIn: false });

    const prepare = (email: string) => t.mutation(internal.engagementEmail.prepareDigestRecipientInternal, { email });
    expect((await prepare(legacy))?.reminder).toBeUndefined();
    expect(await prepare(optedOut)).toBeNull();
    expect((await prepare(optedIn))?.reminder?.key).toBe("academy-discovery");
    await t.mutation(internal.engagementEmail.markEngagementEmailSentInternal, {
      email: optedIn,
      reminderKey: "academy-discovery",
    });
    const afterDelivery = await t.mutation(internal.engagementEmail.prepareDigestRecipientInternal, {
      email: optedIn,
      minDaysSinceLastEmail: 0,
    });
    expect(afterDelivery?.reminder).toBeUndefined();

    const next = "next@example.com";
    await seedLearner(t, next, { emailEngagementOptIn: true });
    await setFlag(t, "engagement.kill_switch", true);
    expect((await prepare(next))?.reminder).toBeUndefined();
  });

  it("links adult creators to their own monetisation requirements", async () => {
    const t = convexTest(schema, modules);
    const email = "creator@example.com";
    await seedLearner(t, email, {
      birthYear: 1990,
      birthMonth: 1,
      emailEngagementOptIn: true,
    });
    await t.run((ctx) => ctx.db.insert("socialProfiles", {
      userId: email,
      displayName: "Creator",
      handle: "creator",
      skills: [],
      interests: [],
      isMain: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    const prepared = await t.mutation(internal.engagementEmail.prepareDigestRecipientInternal, { email });
    expect(prepared?.reminder).toMatchObject({
      key: "creator-monetisation",
      ctaPath: "/gigasocial/?tab=creator&creatorTab=earnings",
    });
  });

  it("honours an explicit administrator override that disables automatic reminders", async () => {
    const t = convexTest(schema, modules);
    const email = "learner@example.com";
    await seedLearner(t, email, { emailEngagementOptIn: true });
    await setFlag(t, "engagement.communication_reminders", false);
    await t.mutation(internal.notificationsInternal.createEngagementReminders, {});
    expect(await t.run((ctx) => ctx.db.query("platformNotifications").collect())).toEqual([]);
    const prepared = await t.mutation(internal.engagementEmail.prepareDigestRecipientInternal, { email });
    expect(prepared?.reminder).toBeUndefined();
  });

  it("creates one inbox item across repeated runs and respects notification preferences", async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const email = "active@example.com";
      await seedLearner(t, email);
      await seedLearner(t, "muted@example.com", {
        userPreferences: JSON.stringify({ notificationsEnabled: false }),
      });
      const run = () => t.mutation(internal.notificationsInternal.createEngagementReminders, {});
      const read = () => t.run((ctx) => ctx.db.query("platformNotifications").collect());
      await run();
      await run();
      expect(await read()).toMatchObject([{ userId: email, category: "learning", read: false }]);
      await t.finishAllScheduledFunctions(vi.runAllTimers);
    } finally {
      vi.useRealTimers();
    }
  });
});
