import { describe, expect, it } from "vitest";
import { legalDocumentBySlug, legalDocuments } from "../../web/lib/legal/content";

describe("legal content", () => {
  it("includes all required policy documents", () => {
    expect(legalDocuments.map((doc) => doc.slug)).toEqual([
      "terms",
      "cookies",
      "refunds",
      "acceptable-use",
    ]);
  });

  it("uses the July 4, 2026 effective date", () => {
    for (const doc of legalDocuments) {
      expect(doc.effectiveDate).toBe("July 4, 2026");
    }
  });

  it("exposes terms with 14 sections", () => {
    expect(legalDocumentBySlug.terms.sections).toHaveLength(14);
    expect(legalDocumentBySlug.terms.sections[0]?.title).toContain("Acceptance");
  });
});
