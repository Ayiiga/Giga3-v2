import { describe, expect, it } from "vitest";
import {
  decideJobRecovery,
  type JobRecoveryConfig,
} from "../../convex/chatReplyRecoveryPolicy";

const cfg: JobRecoveryConfig = {
  rescheduleAfterMs: 30_000,
  giveUpAfterMs: 90_000,
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
        { status: "processing", createdAt: now - 30_000 },
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
        { status: "processing", createdAt: now - 31_000 },
        now,
        cfg
      )
    ).toBe("wait");
  });

  it("finalizes jobs that blew past the give-up window", () => {
    expect(
      decideJobRecovery(
        { status: "pending", createdAt: now - 91_000 },
        now,
        cfg
      )
    ).toBe("finalize");
    expect(
      decideJobRecovery(
        { status: "processing", createdAt: now - 200_000 },
        now,
        cfg
      )
    ).toBe("finalize");
  });
});
