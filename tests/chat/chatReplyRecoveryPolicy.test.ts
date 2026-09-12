import { describe, expect, it } from "vitest";
import {
  DEFAULT_JOB_RECOVERY_CONFIG,
  decideJobRecovery,
} from "../../convex/chatReplyRecoveryPolicy";
import { chatJobProcessingBudgetMs } from "../../convex/chatTiming";

import type { JobRecoveryConfig } from "../../convex/chatReplyRecoveryPolicy";

describe("DEFAULT_JOB_RECOVERY_CONFIG", () => {
  it("allows the full live-web + AI worker budget before finalizing", () => {
    expect(DEFAULT_JOB_RECOVERY_CONFIG.processingGiveUpAfterMs).toBeGreaterThanOrEqual(
      chatJobProcessingBudgetMs({ hasImageAttachment: true })
    );
  });
});

const cfg: JobRecoveryConfig = {
  rescheduleAfterMs: 30_000,
  pendingGiveUpAfterMs: 90_000,
  processingGiveUpAfterMs: 270_000,
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

  it("leaves fresh jobs alone", () => {
    expect(
      decideJobRecovery({ status: "pending", createdAt: now - 5_000 }, now, cfg)
    ).toBe("wait");
    expect(
      decideJobRecovery(
        {
          status: "processing",
          createdAt: now - 120_000,
          processingStartedAt: now - 30_000,
        },
        now,
        cfg
      )
    ).toBe("wait");
  });

  it("reschedules pending jobs that were never picked up", () => {
    expect(
      decideJobRecovery(
        { status: "pending", createdAt: now - 31_000 },
        now,
        cfg
      )
    ).toBe("reschedule");
  });

  it("does NOT reschedule a processing job (avoids duplicate workers)", () => {
    expect(
      decideJobRecovery(
        {
          status: "processing",
          createdAt: now - 31_000,
          processingStartedAt: now - 20_000,
        },
        now,
        cfg
      )
    ).toBe("wait");
  });

  it("finalizes pending jobs stuck before processing starts", () => {
    expect(
      decideJobRecovery(
        { status: "pending", createdAt: now - 91_000 },
        now,
        cfg
      )
    ).toBe("finalize");
  });

  it("finalizes processing jobs that exceed the worker budget", () => {
    expect(
      decideJobRecovery(
        {
          status: "processing",
          createdAt: now - 60_000,
          processingStartedAt: now - 271_000,
        },
        now,
        cfg
      )
    ).toBe("finalize");
  });

  it("uses createdAt when processingStartedAt is missing (legacy rows)", () => {
    expect(
      decideJobRecovery(
        { status: "processing", createdAt: now - 271_000 },
        now,
        cfg
      )
    ).toBe("finalize");
  });
});
