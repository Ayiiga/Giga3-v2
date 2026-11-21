import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("web/app/(marketing)/gigalearn/academy/page.tsx", "utf8");
const assets = readFileSync("web/public/images/gigalearn/learn-destinations.svg", "utf8");
const destinations = [
  ["GigaLearn Academy (Workspace)", "/gigalearn/academy/workspace/", "academy"],
  ["Education and Business Tools", "/documents/", "writing"],
  ["Creators' Tools", "/creator-studio/", "creator"],
  ["Early Years (KG to Lower Primary)", "/gigalearn/?tab=early-years", "early"],
  ["JHS, SHS and TLMs", "/gigalearn/?tab=learn", "school"],
  ["University", "/gigalearn/?tab=learn", "university"],
] as const;

describe("GigaLearn Learn destinations", () => {
  it("keeps six distinct illustrated cards in the requested order", () => {
    let previous = -1;
    for (const [title, href, art] of destinations) {
      const index = page.indexOf(`title: "${title}"`);
      expect(index).toBeGreaterThan(previous);
      previous = index;
      expect(page).toContain(`href: "${href}", art: "${art}"`);
      expect(assets).toContain(`id="${art}"`);
    }
  });
  it("keeps accessible navigation and mobile-visible artwork", () => {
    expect(page).toContain('aria-label="GigaLearn learning destinations"');
    expect(page).toContain('data-testid={`learn-destination-${index + 1}`}');
    expect(page).toContain('viewBox="0 0 64 64"');
    expect(page).toContain('href={`/images/gigalearn/learn-destinations.svg#${item.art}`}');
  });
});
