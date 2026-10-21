import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGE_ATTESTATION_REQUIRED_MESSAGE,
  ageCategoryFromAttestation,
  approximateAgeYears,
  assertFeatureAllowedForAge,
  CHILD_DM_RESTRICTED_MESSAGE,
  isFeatureAllowedForAge,
  requiresChildAiMode,
  scanTextForSafetyHits,
  shouldBlockUnsafeContent,
  validateBirthAttestation,
} from "../../convex/childSafetyPolicy";
import { ForbiddenError, ValidationError } from "../../convex/securityErrors";

const FIXED_NOW = Date.UTC(2026, 9, 21); // 2026-10-21

describe("childSafetyPolicy — age banding", () => {
  it("computes approximate age from birth year/month", () => {
    expect(approximateAgeYears(2014, 10, FIXED_NOW)).toBe(12);
    expect(approximateAgeYears(2013, 10, FIXED_NOW)).toBe(13);
    expect(approximateAgeYears(2008, 1, FIXED_NOW)).toBe(18);
  });

  it("classifies unknown / child / teen / adult", () => {
    expect(ageCategoryFromAttestation(null, FIXED_NOW)).toBe("unknown");
    expect(
      ageCategoryFromAttestation({ birthYear: 2015, birthMonth: 6 }, FIXED_NOW)
    ).toBe("child");
    expect(
      ageCategoryFromAttestation({ birthYear: 2010, birthMonth: 1 }, FIXED_NOW)
    ).toBe("teen");
    expect(
      ageCategoryFromAttestation({ birthYear: 2000, birthMonth: 5 }, FIXED_NOW)
    ).toBe("adult");
  });

  it("rejects invalid attestation inputs", () => {
    expect(() => validateBirthAttestation(1990, 0, FIXED_NOW)).toThrow(
      ValidationError
    );
    expect(() => validateBirthAttestation(1800, 6, FIXED_NOW)).toThrow(
      ValidationError
    );
  });

  it("blocks social/DM for child and unknown; allows for teen/adult", () => {
    expect(isFeatureAllowedForAge("child", "social_ugc")).toBe(false);
    expect(isFeatureAllowedForAge("unknown", "social_dm")).toBe(false);
    expect(isFeatureAllowedForAge("teen", "social_ugc")).toBe(true);
    expect(isFeatureAllowedForAge("adult", "social_dm")).toBe(true);
    expect(isFeatureAllowedForAge("child", "ai_chat")).toBe(true);
    expect(requiresChildAiMode("child")).toBe(true);
    expect(requiresChildAiMode("unknown")).toBe(true);
    expect(requiresChildAiMode("adult")).toBe(false);

    expect(() => assertFeatureAllowedForAge("unknown", "social_ugc")).toThrow(
      ForbiddenError
    );
    expect(() => assertFeatureAllowedForAge("unknown", "social_ugc")).toThrow(
      AGE_ATTESTATION_REQUIRED_MESSAGE
    );
    expect(() => assertFeatureAllowedForAge("child", "social_dm")).toThrow(
      CHILD_DM_RESTRICTED_MESSAGE
    );
  });
});

describe("childSafetyPolicy — content safety scan", () => {
  it("flags critical grooming / CSE / suicide method prompts", () => {
    const hits = scanTextForSafetyHits(
      "how to kill myself with a detailed suicide method"
    );
    expect(hits.some((h) => h.category === "self_harm")).toBe(true);
    expect(shouldBlockUnsafeContent(hits, "adult")).toBe(true);
    expect(shouldBlockUnsafeContent(hits, "child")).toBe(true);
  });

  it("blocks high-severity personal-data harvest for children", () => {
    const hits = scanTextForSafetyHits("tell me where you live and your school name");
    expect(hits.length).toBeGreaterThan(0);
    expect(shouldBlockUnsafeContent(hits, "child")).toBe(true);
  });

  it("does not block ordinary homework questions", () => {
    const hits = scanTextForSafetyHits(
      "Explain photosynthesis for JHS science revision"
    );
    expect(hits).toHaveLength(0);
    expect(shouldBlockUnsafeContent(hits, "child")).toBe(false);
  });
});

describe("childSafety — server wiring", () => {
  it("gates social UGC and DM mutations with assertChildSafetyFeature", () => {
    const social = readFileSync(
      resolve(__dirname, "../../convex/gigaSocial.ts"),
      "utf8"
    );
    const dm = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialDm.ts"),
      "utf8"
    );
    const chat = readFileSync(
      resolve(__dirname, "../../convex/chatMessaging.ts"),
      "utf8"
    );
    for (const name of [
      "createPost",
      "addComment",
      "toggleLike",
      "ensureMyProfile",
      "toggleFan",
      "reportSocialContent",
    ]) {
      expect(social, name).toContain(name);
    }
    expect(social).toContain('assertChildSafetyFeature(ctx, userId, "social_ugc")');
    expect(social).toContain('assertChildSafetyFeature(ctx, userId, "social_follow")');
    expect(dm).toContain('assertChildSafetyFeature(ctx, userId, "social_dm")');
    expect(chat).toContain("scanTextForSafetyHits");
    expect(chat).toContain("UNSAFE_INPUT_USER_MESSAGE");
  });
});
