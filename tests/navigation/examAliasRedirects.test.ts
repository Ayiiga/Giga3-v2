import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeAppPath } from "../../web/lib/navigation/safeNavigate";
import { siteConfig } from "../../web/lib/site";

const ROOT = resolve(__dirname, "../..");

describe("Exam Practice path normalization", () => {
  it("keeps siteConfig exam href trailing-slash ready for static export", () => {
    expect(siteConfig.links.gigalearnExam).toBe("/gigalearn/exam/");
    expect(normalizeAppPath("/gigalearn/exam")).toBe("/gigalearn/exam/");
    expect(normalizeAppPath("/gigalearn/exam/")).toBe("/gigalearn/exam/");
    expect(normalizeAppPath("/exam")).toBe("/exam/");
  });

  it("documents stale promotion PDF redirects for pre-dedupe filenames", () => {
    const redirects = readFileSync(resolve(ROOT, "web/public/_redirects"), "utf8");
    expect(redirects).toContain(
      "GigaLearn_AD_I_282_Practice_Questions_Answers.pdf"
    );
    expect(redirects).toContain("GigaLearn_AD_I_87_Practice_Questions_Answers.pdf");
    expect(redirects).toContain("GigaLearn_DD_52_Practice_Questions_Answers.pdf");
    expect(redirects).toContain("GigaLearn_D_II_40_Practice_Questions_Answers.pdf");
    expect(redirects).toContain("GigaLearn_D_I_46_Practice_Questions_Answers.pdf");
  });
});
