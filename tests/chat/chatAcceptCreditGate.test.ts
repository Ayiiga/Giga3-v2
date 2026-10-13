import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CREDIT_COSTS, creditActionForMode } from "../../convex/creditsConfig";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("chat acceptMessage credit gate", () => {
  it("maps modes to positive credit costs", () => {
    expect(CREDIT_COSTS[creditActionForMode("general")]).toBeGreaterThan(0);
    expect(CREDIT_COSTS[creditActionForMode("homework")]).toBeGreaterThan(0);
    expect(CREDIT_COSTS[creditActionForMode("research")]).toBeGreaterThan(0);
  });

  it("acceptMessage pre-checks balance before enqueueing AI", () => {
    const src = read("convex/chatMessaging.ts");
    expect(src).toContain('from "./creditsConfig"');
    expect(src).toContain("creditActionForMode(mode)");
    expect(src).toContain("Insufficient credits");
    expect(src).toMatch(/creditBalance\s*<\s*creditCost/);
  });

  it("worker deduct uses jobId reference (not only conversationId)", () => {
    const src = read("convex/chatReplyWorker.ts");
    expect(src).toContain("const deductReference = String(args.jobId)");
    expect(src).toContain("reference: deductReference");
  });

  it("deleteJob retains terminal jobs for clientRequestId dedupe", () => {
    const src = read("convex/chatReplyJobs.ts");
    expect(src).toContain("CHAT_JOB_DONE_RETAIN");
    expect(src).not.toMatch(
      /export const deleteJob = internalMutation\(\{[\s\S]*?await ctx\.db\.delete\(args\.jobId\)/
    );
  });
});
