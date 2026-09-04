import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("GigaSocial blog body limits", () => {
  it("allows 6000 characters for education posts on the server", () => {
    const src = readFileSync(join(process.cwd(), "convex/gigaSocialViews.ts"), "utf8");
    expect(src).toContain("const MAX_BLOG_BODY = 6000");
    expect(src).toContain('postType === "education"');
    expect(src).toContain("socialBodyMaxLength");
  });
});
