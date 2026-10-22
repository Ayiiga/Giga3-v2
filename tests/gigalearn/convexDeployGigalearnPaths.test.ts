/**
 * Convex bundles web/lib/gigalearn at deploy time. Path filters must include
 * those files or bank/shuffle/entitlement changes never reach production.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

describe("Convex deploy path filter includes GigaLearn bundles", () => {
  it("watches web/lib/gigalearn/** so bank and shuffle updates deploy", () => {
    const workflow = readFileSync(
      resolve(ROOT, ".github/workflows/convex-deploy.yml"),
      "utf8"
    );
    expect(workflow).toContain("web/lib/gigalearn/**");
    expect(workflow).toContain("convex/**");

    const techBanks = readFileSync(
      resolve(ROOT, "convex/gigaLearnTechBanks.ts"),
      "utf8"
    );
    expect(techBanks).toContain("../web/lib/gigalearn/academy/techBanks/techBankServer");
    expect(techBanks).toContain("../web/lib/gigalearn/examPractice/optionShuffle");
    expect(techBanks).toContain("../web/lib/gigalearn/examPractice/practiceLimits");
  });
});
