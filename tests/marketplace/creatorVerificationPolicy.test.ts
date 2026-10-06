import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateCreatorVerification,
  isValidNationalId,
  isWithinGhana,
  normalizeNationalId,
} from "../../convex/creatorVerificationPolicy";

describe("creatorVerificationPolicy", () => {
  it("accepts Ghana Card format and legacy IDs", () => {
    expect(isValidNationalId("GHA-123456789-0")).toBe(true);
    expect(isValidNationalId("GHA1234567890")).toBe(true);
    expect(normalizeNationalId(" gha-123456789-0 ")).toBe("GHA-123456789-0");
  });

  it("rejects invalid ID numbers", () => {
    expect(isValidNationalId("123")).toBe(false);
    expect(isValidNationalId("!!!")).toBe(false);
  });

  it("requires Ghana GPS bounds", () => {
    expect(isWithinGhana(5.6037, -0.187)).toBe(true);
    expect(isWithinGhana(51.5074, -0.1278)).toBe(false);
  });

  it("auto-approves when ID, document, and Ghana coordinates pass", () => {
    const result = evaluateCreatorVerification({
      nationalIdNumber: "GHA-123456789-0",
      latitude: 5.6037,
      longitude: -0.187,
      locationAccuracyMeters: 40,
      hasIdDocument: true,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects missing ID document", () => {
    const result = evaluateCreatorVerification({
      nationalIdNumber: "GHA-123456789-0",
      latitude: 5.6037,
      longitude: -0.187,
      hasIdDocument: false,
    });
    expect(result.ok).toBe(false);
  });

  it("submitCreatorVerification auto-approves on success", () => {
    const source = readFileSync(resolve(__dirname, "../../convex/creatorProfiles.ts"), "utf8");
    expect(source).toContain('verificationStatus: "approved"');
    expect(source).toContain("evaluateCreatorVerification");
    expect(source).not.toContain("Our team will review your national ID");
  });
});
