import { describe, expect, it } from "vitest";
import {
  SEO_DESCRIPTION_MAX,
  SEO_DESCRIPTION_MIN,
  SEO_TITLE_MAX,
  clampSeoDescription,
  clampSeoTitle,
} from "@/lib/seo/seoText";

describe("clampSeoTitle", () => {
  it("leaves short titles untouched", () => {
    expect(clampSeoTitle("GigaLearn practice")).toBe("GigaLearn practice");
  });

  it("keeps rendered titles within 70 chars including layout suffix", () => {
    const out = clampSeoTitle(
      "One Million Coders: Can Ghana Really Become Africa's Next Tech Powerhouse?"
    );
    expect(out.length + " | Giga3 AI".length).toBeLessThanOrEqual(SEO_TITLE_MAX);
  });

  it("preserves the uniqueness token at the end", () => {
    const out = clampSeoTitle(
      "This knot will keep your hands secure while filming the best jollof tutorial in Accra today",
      "a1b2c3d4"
    );
    expect(out.endsWith("· a1b2c3d4")).toBe(true);
    expect(out.length + " | Giga3 AI".length).toBeLessThanOrEqual(SEO_TITLE_MAX);
  });
  it("re-clamps when truncation removes the Giga3 brand substring", () => {
    const out = clampSeoTitle(
      "Market day prices in Kumasi stations and why Giga3 AI users track them daily for savings",
      "k4567890"
    );
    const rendered = out.includes("Giga3") ? out : `${out} | Giga3 AI`;
    expect(rendered.length).toBeLessThanOrEqual(SEO_TITLE_MAX);
    expect(out.endsWith("· k4567890")).toBe(true);
  });
});

describe("clampSeoDescription", () => {
  it("truncates long descriptions to 165", () => {
    const out = clampSeoDescription("word ".repeat(60));
    expect(out.length).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
  });

  it("pads thin descriptions past 50 chars", () => {
    const out = clampSeoDescription("Nice photo");
    expect(out.length).toBeGreaterThanOrEqual(SEO_DESCRIPTION_MIN);
    expect(out).toContain("Nice photo");
  });

  it("keeps the uniqueness tail intact when truncating", () => {
    const out = clampSeoDescription(`${"market day in Accra ".repeat(12)}5 views · 3 likes`, "t17abc12");
    expect(out.endsWith("· t17abc12")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
  });
});
