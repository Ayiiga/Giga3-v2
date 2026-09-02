import { describe, expect, it } from "vitest";
import {
  LEGAL_EFFECTIVE_DATE,
  legalDocumentBySlug,
  legalDocuments,
} from "../../web/lib/legal/content";

const text = (slug: keyof typeof legalDocumentBySlug) =>
  JSON.stringify(legalDocumentBySlug[slug]).toLowerCase();

describe("legal content", () => {
  it("includes all required policy documents", () => {
    expect(legalDocuments.map((doc) => doc.slug)).toEqual([
      "terms",
      "privacy",
      "cookies",
      "refunds",
      "acceptable-use",
      "ai-usage",
      "security",
    ]);
  });

  it("uses one shared effective date across documents", () => {
    expect(LEGAL_EFFECTIVE_DATE).toBe("September 2, 2026");
    for (const doc of legalDocuments) {
      expect(doc.effectiveDate).toBe(LEGAL_EFFECTIVE_DATE);
    }
  });

  it("exposes terms with 14 sections", () => {
    expect(legalDocumentBySlug.terms.sections).toHaveLength(14);
    expect(legalDocumentBySlug.terms.sections[0]?.title).toContain("Acceptance");
  });

  it("exposes privacy with key sections", () => {
    expect(legalDocumentBySlug.privacy.sections).toHaveLength(11);
    expect(legalDocumentBySlug.privacy.sections[0]?.title).toBe("Information We Collect");
  });

  it("terms and refunds describe automatic renewal and wallet cancellation", () => {
    for (const slug of ["terms", "refunds"] as const) {
      const body = text(slug);
      expect(body, slug).toContain("renew automatically");
      expect(body, slug).toContain("wallet");
      expect(body, slug).toMatch(/turn (off|renewal off)/);
    }
    expect(text("terms")).toContain("paystack");
    expect(text("terms")).toContain("tokenised payment authorisation");
  });

  it("policies make no certification or compliance claims", () => {
    const all = JSON.stringify(legalDocuments).toLowerCase();
    for (const banned of ["iso 27001", "soc 2", "pci dss certified", "gdpr compliant", "certified"]) {
      expect(all, banned).not.toContain(banned);
    }
    expect(text("security")).toContain("not a certification");
  });

  it("AI usage policy names the real provider chain and credit behaviour", () => {
    const ai = text("ai-usage");
    expect(ai).toContain("openai");
    expect(ai).toContain("gemini");
    expect(ai).toContain("openrouter");
    expect(ai).toContain("live web");
    expect(ai).toContain("no credits are charged");
  });
});
