/**
 * Regression tests for:
 * 1) Mobile learning-summary overflow (layout, not overflow:hidden/clip)
 * 2) Already-enrolled enrol flow (idempotent Convex + friendly client copy)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALREADY_ENROLLED_MESSAGE,
  friendlyAcademyEnrolError,
} from "../../web/lib/gigalearn/academy/enrolErrors";

const ROOT = resolve(__dirname, "../..");

describe("Academy mobile learning summary overflow", () => {
  it("uses minmax(0,1fr) stat grid and stacks continue cards on small screens", () => {
    const css = readFileSync(resolve(ROOT, "web/styles/globals.css"), "utf8");
    expect(css).toMatch(
      /\.academy-visual-stat-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s
    );
    expect(css).toMatch(
      /\.academy-visual-course-card\s*\{[^}]*flex-direction:\s*column/s
    );
    expect(css).toContain("overflow-wrap: anywhere");

    const home = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyHome.tsx"),
      "utf8"
    );
    expect(home).toContain('className="academy-visual-stat-grid"');
    expect(home).toContain("academy-visual-course-card__copy");
    expect(home).toContain("min-w-0");
    // Truncate/clip must not be the primary fix for the summary title.
    expect(home).not.toMatch(/resumeTitle[\s\S]{0,80}truncate/);
  });

  it("keeps desktop course-card row layout at sm+", () => {
    const css = readFileSync(resolve(ROOT, "web/styles/globals.css"), "utf8");
    expect(css).toMatch(
      /@media \(min-width: 640px\)\s*\{\s*\.academy-visual-course-card\s*\{[^}]*flex-direction:\s*row/s
    );
  });
});

describe("Academy already-enrolled enrol UX", () => {
  it("exposes the canonical friendly already-enrolled message", () => {
    expect(ALREADY_ENROLLED_MESSAGE).toBe("You're already enrolled in this course.");
  });

  it("maps Convex stack traces and short already-enrolled errors", () => {
    const raw =
      "[CONVEX M(gigaLearnAcademy:enrollInCourse)] [Request ID: abc] Server Error Uncaught Error: You are already enrolled in this course. at handler (../convex/gigaLearnAcademy.ts:350:24) Called by client";
    expect(friendlyAcademyEnrolError(new Error(raw))).toBe(ALREADY_ENROLLED_MESSAGE);
    expect(friendlyAcademyEnrolError(new Error("You are already enrolled in this course."))).toBe(
      ALREADY_ENROLLED_MESSAGE
    );
  });

  it("makes enrolInCourse idempotent without resetting progress", () => {
    const academy = readFileSync(resolve(ROOT, "convex/gigaLearnAcademy.ts"), "utf8");
    expect(academy).toContain("alreadyEnrolled");
    expect(academy).toContain("alreadyCompleted");
    expect(academy).toContain(".collect()");
    expect(academy).toMatch(/existingRows\.find\(\(row\) => row\.status === "active"\)/);
    expect(academy).not.toMatch(/throw new Error\("You are already enrolled/);
    // Active path returns existing id — must not patch progressPercent to 0.
    const activeBlock = academy.match(
      /if \(existing && existing\.status === "active"\) \{[\s\S]*?return \{[\s\S]*?alreadyEnrolled[\s\S]*?\};/
    )?.[0];
    expect(activeBlock).toBeTruthy();
    expect(activeBlock).not.toContain("progressPercent: 0");
    expect(activeBlock).not.toContain("ctx.db.patch");
    expect(activeBlock).not.toContain("ctx.db.insert");
  });

  it("surfaces Continue course CTA with the friendly already-enrolled info", () => {
    const detail = readFileSync(
      resolve(ROOT, "web/components/gigalearn/academy/AcademyCourseDetail.tsx"),
      "utf8"
    );
    expect(detail).toContain("ALREADY_ENROLLED_MESSAGE");
    expect(detail).toContain("Continue course");
    expect(detail).toContain('info === ALREADY_ENROLLED_MESSAGE');
    expect(detail).toContain("alreadyEnrolled");
  });
});
