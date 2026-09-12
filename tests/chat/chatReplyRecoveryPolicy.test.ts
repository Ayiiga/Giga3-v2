import { describe, expect, it } from "vitest";
import {
  getJobRecoveryConfig,
  decideJobRecovery,
} from "../../convex/chatReplyRecoveryPolicy";
import { chatJobProcessingBudgetMs } from "../../convex/chatTiming";

import type { JobRecoveryConfig } from "../../convex/chatReplyRecoveryPolicy";

describe("getJobRecoveryConfig", () => {
  it("allows the full live-web + AI worker budget before finalizing", () => {
    const cfg = getJobRecoveryConfig({});
    expect(cfg.processingGiveUpAfterMs).toBeGreaterThanOrEqual(
      chatJobProcessingBudgetMs({ hasImageAttachment: true })
    );
  });
});

const cfg: JobRecoveryConfig = {
  rescheduleAfterMs: 30_000,
  pendingGiveUpAfterMs: 180_000,
  processingGiveUpAfterMs: 360_000,
  activityGraceMs: 120_000,
  maxReschedulesBeforeFinalize: 4,
};

const now = 1_000_000_000;

describe("decideJobRecovery", () => {
  it("cleans up finished / cancelled leftovers", () => {
    for (const status of ["done", "failed", "cancelled"] as const) {
      expect(
        decideJobRecovery({ status, createdAt: now }, now, cfg)
      ).toBe("cleanup");
    }
    expect(
      decideJobRecovery(
        { status: "processing", cancelled: true, createdAt: now },
        now,
        cfg
      )
    ).toBe("cleanup");
  });

  it("leaves fresh and recently active jobs alone", () => {
    expect(
      decideJobRecovery({ status: "pending", createdAt: now - 5_000 }, now, cfg)
    ).toBe("wait");
    expect(
      decideJobRecovery(
        {
          status: "processing",
          createdAt: now - 300_000,
          processingStartedAt: now - 200_000,
          lastActivityAt: now - 30_000,
        },
        now,
        cfg
      )
    ).toBe("wait");
  });

  it("reschedules pending jobs that were never picked up", () => {
    expect(
      decideJobRecovery(
        {
          status: "pending",
          createdAt: now - 31_000,
          lastActivityAt: now - 31_000,
        },
        now,
        cfg
      )
    ).toBe("reschedule");
  });

  it("reschedules stale processing jobs before giving up", () => {
    expect(
      decideJobRecovery(
        {
          status: "processing",
          createdAt: now - 400_000,
          processingStartedAt: now - 370_000,
          lastActivityAt: now - 370_000,
          rescheduleCount: 1,
        },
        now,
        cfg
      )
    ).toBe("reschedule");
  });

  it("finalizes only after reschedule budget is exhausted", () => {
    expect(
      decideJobRecovery(
        {
          status: "pending",
          createdAt: now - 200_000,
          lastActivityAt: now - 200_000,
          rescheduleCount: 4,
        },
        now,
        cfg
      )
    ).toBe("finalize");
    expect(
      decideJobRecovery(
        {
          status: "processing",
          createdAt: now - 400_000,
          processingStartedAt: now - 370_000,
          lastActivityAt: now - 370_000,
          rescheduleCount: 4,
        },
        now,
        cfg
      )
    ).toBe("finalize");
  });
});
