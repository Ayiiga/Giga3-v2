import { describe, expect, it } from "vitest";
import { sanitizeMermaidSvg } from "../../web/lib/security/sanitizeMermaidSvg";

describe("sanitizeMermaidSvg", () => {
  it("allows basic svg output", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>ok</text></svg>';
    expect(sanitizeMermaidSvg(svg)).toContain("<text>ok</text>");
  });

  it("strips script tags and event handlers", () => {
    const svg =
      '<svg onload="alert(1)"><script>alert(1)</script><text>ok</text></svg>';
    const cleaned = sanitizeMermaidSvg(svg);
    expect(cleaned).not.toContain("<script");
    expect(cleaned).not.toContain("onload=");
    expect(cleaned).toContain("<text>ok</text>");
  });

  it("rejects non-svg payloads", () => {
    expect(sanitizeMermaidSvg('<div>not svg</div>')).toBe("");
  });
});
