import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Creator Studio mobile UX", () => {
  it("exposes New post and Publish actions", () => {
    const studio = readFileSync(
      join(root, "web/components/creator-studio/CreatorStudioClient.tsx"),
      "utf8"
    );
    expect(studio).toContain("New post");
    expect(studio).toContain("/gigasocial/?compose=text");
    expect(studio).toContain("creator-section-nav");

    const result = readFileSync(
      join(root, "web/components/creator-studio/CreatorResultPanel.tsx"),
      "utf8"
    );
    expect(result).toContain("Publish");
    expect(result).toContain("stageCreatorComposeHandoff");
  });

  it("loads GigaSocial compose handoff from Creator Studio", () => {
    const feed = readFileSync(
      join(root, "web/components/gigasocial/GigaSocialFeedPanel.tsx"),
      "utf8"
    );
    expect(feed).toContain('creatorDraft.kind === "blog"');
  });
});
