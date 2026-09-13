import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { decideJobRecovery } from "../../convex/chatReplyRecoveryPolicy";
import {
  isFastTextReplyJob,
  shouldUseConversationalWorker,
} from "../../convex/researchCapabilities";

const cfg = {
  rescheduleAfterMs: 30_000,
  pendingGiveUpAfterMs: 180_000,
  processingGiveUpAfterMs: 360_000,
  activityGraceMs: 120_000,
  maxReschedulesBeforeFinalize: 4,
};

const now = 1_000_000_000;

describe("shouldUseConversationalWorker", () => {
  it("routes plain text without live web to the conversational worker", () => {
    expect(
      shouldUseConversationalWorker({ needsLiveWeb: false, attachmentCount: 0 })
    ).toBe(true);
    expect(
      shouldUseConversationalWorker({ needsLiveWeb: false, attachmentCount: 1 })
    ).toBe(false);
    expect(
      shouldUseConversationalWorker({ needsLiveWeb: true, attachmentCount: 0 })
    ).toBe(false);
  });
});

describe("acceptMessage conversational routing", () => {
  const source = readFileSync("convex/chatMessaging.ts", "utf8");

  it("routes text-only chat to the conversational worker", () => {
    expect(source).toContain('kind === "conversational"');
    expect(source).toContain("internal.chatConversationalReply.processTurn");
    expect(source).toContain("shouldUseConversationalWorker");
  });
});

describe("decideJobRecovery conversational jobs", () => {
  it("treats general text jobs as fast conversational recovery", () => {
    expect(
      isFastTextReplyJob({
        kind: "reply",
        content: "What is 2+2?",
        liveWeb: false,
      })
    ).toBe(true);
  });

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

  it("reschedules stale general text pending jobs quickly", () => {
    expect(
      decideJobRecovery(
        {
          status: "pending",
          kind: "reply",
          content: "What is 2+2?",
          liveWeb: false,
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
          liveWeb: true,
          createdAt: now - 95_000,
          rescheduleCount: 1,
        },
        now,
        cfg
      )
    ).toBe("reschedule");
  });
});

describe("chatReplyWorker logging", () => {
  it("imports logChatReply so the worker can start", () => {
    const source = readFileSync("convex/chatReplyWorker.ts", "utf8");
    expect(source).toContain('import { logChatReply } from "./chatReplyLog"');
    expect(source).toContain('logChatReply("worker_start"');
  });
});
