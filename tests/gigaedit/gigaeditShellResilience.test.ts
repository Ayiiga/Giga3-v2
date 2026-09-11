import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("GigaEdit shell resilience", () => {
  it("wraps client in chunk-retry loader, ConvexAppShell, and error boundary", () => {
    const pageRoot = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/GigaEditPageRoot.tsx"),
      "utf8"
    );
    expect(pageRoot).toContain("withChunkRetryLoader");
    expect(pageRoot).toContain("ConvexAppShell");
    expect(pageRoot).toContain("GigaEditShellBoundary");
    expect(pageRoot).toContain("ClientAppHydrationNotice");
  });

  it("exports a real error boundary with chunk recovery (not silent fallback)", () => {
    const boundary = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/GigaEditShellBoundary.tsx"),
      "utf8"
    );
    expect(boundary).toContain("isChunkLoadError");
    expect(boundary).toContain("recoverFromStaleChunks");
    expect(boundary).toContain("GigaEdit couldn");
    expect(boundary).toContain("toUserFacingError");
  });

  it("registers route-level error.tsx for uncaught errors", () => {
    const errorPage = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/gigaedit/error.tsx"),
      "utf8"
    );
    expect(errorPage).toContain("GigaEdit encountered an error");
  });

  it("avoids duplicate H1 in hydrated home (SEO header owns h1)", () => {
    const home = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/GigaEditHome.tsx"),
      "utf8"
    );
    expect(home).not.toMatch(/<h1[\s>]/);
    expect(home).toContain("gigaedit-hero__title");
  });
});
