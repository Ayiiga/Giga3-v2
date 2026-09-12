import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { decideJobRecovery } from "../../convex/chatReplyRecoveryPolicy";

const cfg = {
  rescheduleAfterMs: 30_000,
  pendingGiveUpAfterMs: 180_000,
  processingGiveUpAfterMs: 360_000,
  activityGraceMs: 120_000,
  maxReschedulesBeforeFinalize: 4,
};

const now = 1_000_000_000;

describe("acceptMessage conversational routing", () => {
  const source = readFileSync("convex/chatMessaging.ts", "utf8");

  it("routes greetings to the conversational worker", () => {
    expect(source).toContain('kind === "conversational"');
    expect(source).toContain("internal.chatConversationalReply.processTurn");
    expect(source).toContain("isConversationalChatQuery(args.content.trim())");
  });
});

describe("decideJobRecovery conversational jobs", () => {
  it("reschedules stale conversational pending jobs quickly", () => {
    expect(
      decideJobRecovery(
        {
          status: "pending",
          kind: "conversational",
          content: "Hello",
          createdAt: now - 25_000,
        },
        now,
        cfg
      )
    ).toBe("reschedule");
  });

  it("never waits six minutes before acting on conversational pending jobs", () => {
    expect(
      decideJobRecovery(
        {
          status: "pending",
          kind: "conversational",
          content: "Hello dear",
          createdAt: now - 95_000,
          rescheduleCount: 2,
        },
        now,
        cfg
      )
    ).toBe("finalize");
  });

  it("still uses extended budget for research jobs", () => {
    expect(
      decideJobRecovery(
        {
          status: "pending",
          kind: "reply",
          content: "Latest Ghana news today with sources",
          createdAt: now - 95_000,
          rescheduleCount: 1,
        },
        now,
        cfg
      )
    ).toBe("reschedule");
  });
});
