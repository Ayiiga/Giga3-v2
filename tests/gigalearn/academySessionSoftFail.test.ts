import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

/**
 * Convex useQuery rethrows UnauthorizedError into the Next.js error boundary.
 * Academy personalization list queries must soft-fail via tryRequireSession.
 */
describe("Academy personalization queries soft-fail invalid sessions", () => {
  it("listMyEnrolments uses tryRequireSession and returns [] when unauthenticated", () => {
    const src = read("convex/gigaLearnAcademy.ts");
    const block = src.slice(src.indexOf("export const listMyEnrolments"));
    expect(block).toContain("tryRequireSession");
    expect(block).toMatch(/if\s*\(\s*!email\s*\)\s*return\s*\[\]/);
  });

  it("listMyAssessmentHistory soft-fails invalid sessions", () => {
    const src = read("convex/gigaLearnAcademyAssessments.ts");
    const block = src.slice(src.indexOf("export const listMyAssessmentHistory"));
    expect(block).toContain("tryRequireSession");
    expect(block).toMatch(/if\s*\(\s*!email\s*\)\s*return\s*\[\]/);
  });

  it("listMyCertificates soft-fails invalid sessions", () => {
    const src = read("convex/gigaLearnAcademyCertificates.ts");
    const block = src.slice(src.indexOf("export const listMyCertificates"));
    expect(block).toContain("tryRequireSession");
    expect(block).toMatch(/if\s*\(\s*!email\s*\)\s*return\s*\[\]/);
  });

  it("listMyNextSteps soft-fails invalid sessions with empty steps", () => {
    const src = read("convex/gigaLearnEngagement.ts");
    const block = src.slice(src.indexOf("export const listMyNextSteps"));
    expect(block).toContain("tryRequireSession");
    expect(block).toMatch(/steps:\s*\[\]/);
  });

  it("listProgress soft-fails invalid sessions so /gigalearn hub cannot crash", () => {
    const src = read("convex/gigaLearnProgress.ts");
    const block = src.slice(src.indexOf("export const listProgress"));
    expect(block).toContain("tryRequireSession");
    expect(block).toMatch(/if\s*\(\s*!email\s*\)\s*return\s*\[\]/);
  });

  it("credits.getUsageSnapshot soft-fails invalid sessions (null, not throw)", () => {
    const src = read("convex/credits.ts");
    const block = src.slice(src.indexOf("export const getUsageSnapshot"));
    expect(block).toContain("tryRequireSession");
    expect(block).toMatch(/if\s*\(\s*!userId\s*\)\s*return\s*null/);
  });
});
