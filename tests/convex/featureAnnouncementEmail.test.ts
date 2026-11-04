import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("feature announcement emails", () => {
  it("adds a branded feature announcement action with opt-in safeguards", () => {
    const actions = readFileSync(
      resolve(__dirname, "../../convex/engagementEmailActions.ts"),
      "utf8"
    );
    const safety = readFileSync(
      resolve(__dirname, "../../convex/engagementAnnouncementSafety.ts"),
      "utf8"
    );
    expect(actions).toContain("sendFeatureAnnouncementEmails");
    expect(actions).toContain("feature_announcement");
    expect(actions).toContain("Unsubscribe from these emails");
    expect(actions).toContain("resolveCampaignEmailCopy");
    expect(actions).toContain("isTipCampaignKey");
    expect(actions).toContain("announcementSenderPreflight");
    expect(actions).toContain("sendEmailWithBoundedRetry");
    expect(actions).toContain("markFeatureAnnouncementSentInternal");
    expect(actions).toContain('v.literal("smoke")');
    expect(actions).toContain("claimFeatureAnnouncementSendInternal");
    expect(actions).toContain("reconcileFeatureAnnouncementDeliveryInternal");
    expect(safety).toContain("What’s new in Giga3 AI");
    expect(safety).toContain('feature_announcement_v3');
    expect(safety).toContain("Teacher Promotion");
    expect(safety).toContain("GigaSocial Awards");
    expect(safety).toContain("public candidate profile");
    expect(safety).toContain("tipCampaignKey");
    const welcome = readFileSync(resolve(__dirname, "../../convex/authPasswordActions.ts"), "utf8");
    expect(welcome).toContain("Welcome to Giga3 AI — learn, achieve and create");
    expect(welcome).toContain("GigaSocial Awards");
    expect(welcome).toContain("Teacher Promotion");
    expect(welcome).toContain("research papers");
  });

  it("schedules weekly feature announcements via crons", () => {
    const crons = readFileSync(resolve(__dirname, "../../convex/crons.ts"), "utf8");
    expect(crons).toContain("feature announcement emails");
    expect(crons).toContain("sendFeatureAnnouncementEmails");
    expect(crons).toContain("minDaysSinceLastEmail: 12");
  });
});
