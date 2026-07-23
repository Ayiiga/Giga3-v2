import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Phase 5 beta invites module", () => {
  it("gates mutations behind phase5.beta", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/phase5Beta.ts"),
      "utf8"
    );
    expect(src).toContain('isPhase5FlagEnabled(ctx, "phase5.beta")');
    expect(src).toContain("joinBetaWaitlist");
    expect(src).toContain("redeemBetaInvite");
    expect(src).toContain("createBetaInviteAdmin");
  });

  it("adds additive schema tables for invites and waitlist", () => {
    const schema = readFileSync(
      resolve(__dirname, "../../convex/schema.ts"),
      "utf8"
    );
    expect(schema).toContain("betaInviteCodes");
    expect(schema).toContain("betaWaitlist");
    expect(schema).toContain("betaCohortMembers");
    expect(schema).toContain("trusted_tester");
  });

  it("client panel early-returns when flag is off", () => {
    const panel = readFileSync(
      resolve(__dirname, "../../web/components/phase5/BetaGrowthPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("if (!flags.beta) return null");
  });
});
