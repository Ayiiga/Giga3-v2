/**
 * Learn tab lands on Academy — Early years / Basic school must stay visible there.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

describe("Academy Early years & Basic school visibility", () => {
  it("surfaces Early years and Basic school on Academy Home above the fold content", () => {
    const home = read("web/components/gigalearn/academy/AcademyHome.tsx");
    expect(home).toContain("SchoolPathways");
    expect(home).toContain('data-testid="academy-school-pathways"');
    expect(home).toContain('data-testid="academy-pathway-early-years"');
    expect(home).toContain('data-testid="academy-pathway-basic-school"');
    expect(home).toContain("/gigalearn/?tab=early-years");
    expect(home).toContain("/gigalearn/?tab=learn");
    expect(home).toContain("Early years");
    expect(home).toContain("Basic school");
    // Pathways render immediately after the welcome hero — before summary/studios.
    const pathwaysAt = home.indexOf("<SchoolPathways");
    const summaryAt = home.indexOf("<PersonalLearningSummary");
    const studiosAt = home.indexOf("<LearningStudiosDirectory");
    expect(pathwaysAt).toBeGreaterThan(0);
    expect(summaryAt).toBeGreaterThan(pathwaysAt);
    expect(studiosAt).toBeGreaterThan(pathwaysAt);
  });

  it("exposes Early years and Basic school in AcademyChrome nav (near the front)", () => {
    const chrome = read("web/components/gigalearn/academy/AcademyChrome.tsx");
    expect(chrome).toContain('label: "Early years"');
    expect(chrome).toContain('label: "Basic school"');
    expect(chrome).toContain("/gigalearn/?tab=early-years");
    expect(chrome).toContain("/gigalearn/?tab=learn");
    const earlyAt = chrome.indexOf('label: "Early years"');
    const coursesAt = chrome.indexOf('label: "Courses"');
    const hubsAt = chrome.indexOf('label: "GigaLearn hubs"');
    expect(earlyAt).toBeGreaterThan(0);
    expect(earlyAt).toBeLessThan(coursesAt);
    expect(earlyAt).toBeLessThan(hubsAt);
  });

  it("keeps Learn primary-nav pointing at Academy (education-first)", () => {
    const nav = read("web/lib/navigation/primaryNav.ts");
    expect(nav).toContain("gigalearnAcademy");
    expect(nav).toContain('id: "learn"');
  });
});
