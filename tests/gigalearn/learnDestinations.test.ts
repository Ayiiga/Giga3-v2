import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("web/app/(marketing)/gigalearn/academy/page.tsx", "utf8");
const destinations = [
  ["GigaLearn Academy (Workspace)", "/gigalearn/academy/workspace/", "🎓", "#1459c7"],
  ["Education and Business Tools", "/documents/", "📚", "#147d45"],
  ["Creators' Tools", "/creator-studio/", "🎬", "#a94c08"],
  ["Early Years (KG to Lower Primary)", "/gigalearn/?tab=early-years", "🧸", "#b52b73"],
  ["JHS, SHS and TLMs", "/gigalearn/?tab=learn", "🔬", "#087889"],
  ["University", "/gigalearn/?tab=learn", "🏛️", "#6334b6"],
] as const;

describe("GigaLearn Learn destinations", () => {
  it("preserves the six destinations in order with unique enlarged pictograms and backgrounds", () => {
    let previous = -1;
    for (const [title, href, illustration, background] of destinations) {
      const index = page.indexOf(`title: "${title}"`);
      expect(index).toBeGreaterThan(previous);
      previous = index;
      expect(page).toContain(`href: "${href}", illustration: "${illustration}", background: "${background}"`);
    }
    expect(new Set(destinations.map((item) => item[2])).size).toBe(6);
    expect(new Set(destinations.map((item) => item[3])).size).toBe(6);
  });

  it("uses accessible navigation and explicit Android-safe card colors", () => {
    expect(page).toContain('aria-label="GigaLearn learning destinations"');
    expect(page).toContain('data-testid={`learn-destination-${index + 1}`}');
    expect(page).toContain('style={{ backgroundColor: item.background, color: "#ffffff" }}');
    expect(page).toContain('WebkitTextFillColor: "#ffffff"');
    expect(page).toContain('{item.illustration}');
    expect(page).toContain('text-5xl');
  });
});
