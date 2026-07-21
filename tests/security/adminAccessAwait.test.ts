import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** Guard against forgetting to await async ensureAdminAccess (auth bypass risk). */
describe("admin access await hygiene", () => {
  const files = [
    "convex/securityMonitoring.ts",
    "convex/systemHealth.ts",
    "convex/platformFeedback.ts",
    "convex/adminUsers.ts",
    "convex/adminMarketplace.ts",
  ];

  for (const file of files) {
    it(`${file} awaits ensureAdminAccess`, () => {
      const src = readFileSync(resolve(__dirname, "../../", file), "utf8");
      const bare = src.match(/(?<!await )ensureAdminAccess\(/g);
      expect(bare).toBeNull();
      expect(src).toContain("await ensureAdminAccess(");
    });
  }

  it("security dashboard uses shared adminCredentialArgs", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/securityMonitoring.ts"),
      "utf8"
    );
    expect(src).toContain("adminCredentialArgs");
    expect(src).toContain("from \"./adminAccess\"");
  });
});
