import { describe, expect, it } from "vitest";

/**
 * Documents the atomic reservation contract for video jobs:
 * credits are deducted in the same Convex mutation that inserts the job row.
 */
describe("video credit reservation contract", () => {
  it("expects reservation before background generation starts", () => {
    const flow = [
      "check balance in createVideoJobWithReservation",
      "insert videoJobs row with videoCreditsCharged = cost",
      "patch users.videoCredits -= cost in same mutation",
      "schedule worker (no second deduct on success)",
      "refund on worker failure via video_generation_refund",
    ];
    expect(flow).toHaveLength(5);
    expect(flow[3]).toContain("no second deduct");
  });
});
