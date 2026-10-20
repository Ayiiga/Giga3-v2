import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("stale-session crash hardening", () => {
  it("Technology Hub mounts under ConvexAppShell", () => {
    const src = read("web/components/gigalearn/academy/TechHubPractice.tsx");
    expect(src).toContain("ConvexAppShell");
    expect(src).toMatch(/export function TechHubPractice\(\)[\s\S]*ConvexAppShell/);
  });

  it("ConvexAppShell wraps SessionQueryErrorBoundary", () => {
    const shell = read("web/components/providers/ConvexAppShell.tsx");
    expect(shell).toContain("SessionQueryErrorBoundary");
    const boundary = read("web/components/providers/SessionQueryErrorBoundary.tsx");
    expect(boundary).toContain("clearAllClientAuth");
    expect(boundary).toContain("Unauthorized");
  });

  it("global notification list soft-fails invalid sessions", () => {
    const src = read("convex/platformNotifications.ts");
    const block = src.slice(src.indexOf("export const listNotifications"));
    expect(block).toContain("tryRequireSession");
    expect(block).toMatch(/notifications:\s*\[\]/);
  });

  it("wallet dashboard soft-fails invalid sessions", () => {
    const src = read("convex/gigaWallet.ts");
    const block = src.slice(src.indexOf("export const getDashboard"));
    expect(block).toContain("tryRequireSession");
    expect(block).toMatch(/if\s*\(\s*!userId\s*\)\s*return\s*null/);
  });

  it("home dashboard soft-fails invalid sessions", () => {
    const src = read("convex/platformGrowth.ts");
    const block = src.slice(src.indexOf("export const getHomeDashboard"));
    expect(block).toContain("tryRequireSession");
    expect(block).toMatch(/if\s*\(\s*!email\s*\)\s*return\s*null/);
  });
});
