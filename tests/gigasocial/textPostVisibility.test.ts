import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GigaSocial text post visibility (premium dark theme)", () => {
  it("styles post body text for dark cards in gigasocial-premium.css", () => {
    const css = readFileSync(
      resolve(__dirname, "../../web/styles/gigasocial-premium.css"),
      "utf8"
    );
    expect(css).toContain(".gigasocial-post-description");
    expect(css).toMatch(
      /\.gigasocial-premium \.gigasocial-post-card[\s\S]*\.gigasocial-post-description[\s\S]*var\(--gs-text\)/
    );
  });

  it("exposes text-foreground on caption description for theme overrides", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialPostCaption.tsx"),
      "utf8"
    );
    expect(src).toContain("gigasocial-post-description");
    expect(src).toContain("text-foreground");
  });
});
