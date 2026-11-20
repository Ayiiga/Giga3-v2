import { describe, expect, it } from "vitest";
import {
  GIGALEARN_CREATION_TOOL_IDS,
  isGigaLearnCreationToolId,
  requiresCreatorStudioEntitlement,
} from "../../convex/gigalearnCreationAccess";
import { computeEntitlements, hasFeature } from "../../convex/entitlements";
import { CREATION_TEMPLATES } from "../../web/lib/gigalearn/creation/templates";
import { CREDIT_COSTS } from "../../convex/creditsConfig";

describe("GigaLearn Create credit-based access regression", () => {
  it("exempts precisely the six shipped GigaLearn creation templates", () => {
    const shippedIds = CREATION_TEMPLATES.map((template) => template.backendToolId).sort();
    expect([...GIGALEARN_CREATION_TOOL_IDS].sort()).toEqual(shippedIds);
    for (const toolId of shippedIds) {
      expect(isGigaLearnCreationToolId(toolId)).toBe(true);
      expect(requiresCreatorStudioEntitlement(toolId)).toBe(false);
    }
  });

  it("keeps unrelated Creator Studio and unknown IDs behind the existing entitlement", () => {
    for (const toolId of [
      "video-script-generator",
      "lesson-generator",
      "creator-studio",
      "creation-cv-extra",
      "creation-unknown",
      "",
    ]) {
      expect(isGigaLearnCreationToolId(toolId)).toBe(false);
      expect(requiresCreatorStudioEntitlement(toolId)).toBe(true);
    }
  });

  it("does not make Creator Studio a free-plan entitlement or bypass paid writing credits", () => {
    const free = computeEntitlements({ subscriptionPlan: "free", credits: 25 });
    expect(hasFeature(free, "creator_studio")).toBe(false);
    expect(requiresCreatorStudioEntitlement("creation-cv")).toBe(false);
    expect(CREDIT_COSTS.writing).toBe(2);
  });
});
