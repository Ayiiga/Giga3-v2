import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("feature announcement emails", () => {
  it("adds a branded feature announcement action with opt-in safeguards", () => {
    const actions = readFileSync(
      resolve(__dirname, "../../convex/engagementEmailActions.ts"),
      "utf8"
    );
    expect(actions).toContain("sendFeatureAnnouncementEmails");
    expect(actions).toContain("feature_announcement");
    expect(actions).toContain("Unsubscribe from these emails");
    expect(actions).toContain("What’s new in Giga3 AI");
  });

  it("schedules weekly feature announcements via crons", () => {
    const crons = readFileSync(resolve(__dirname, "../../convex/crons.ts"), "utf8");
    expect(crons).toContain("feature announcement emails");
    expect(crons).toContain("sendFeatureAnnouncementEmails");
    expect(crons).toContain("minDaysSinceLastEmail: 12");
  });
});
