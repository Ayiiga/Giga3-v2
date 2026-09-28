// Resolved from the web app install. Root tests do not depend on React themselves.
import { createElement } from "../../web/node_modules/react";
import { renderToStaticMarkup } from "../../web/node_modules/react-dom/server";
import { describe, expect, it } from "vitest";
import { LowerGradesConcrete } from "../../web/components/gigalearn/LowerGradesConcrete";

describe("lower grades pronunciation UI", () => {
  it("renders an English-first hear button on every concrete item", () => {
    const html = renderToStaticMarkup(createElement(LowerGradesConcrete));
    const hearButtons = html.match(/Pronounce /g) ?? [];
    expect(hearButtons.length).toBeGreaterThanOrEqual(19);
    expect(html).toContain("English is the primary language");
    expect(html).toContain("Use English and play a sample");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Count the apples: 1, 2, 3");
    expect(html).toContain("Kan aprɛ no: 1, 2, 3");
    expect(html).not.toContain("Kan maŋgo");
  });
});
