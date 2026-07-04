import { describe, expect, it } from "vitest";
import {
  isFreeImageGenerationEnabled,
  isLiveNewsEnabled,
  isPushAlertsEnabled,
  openAiImageRequiresSubscription,
} from "../../convex/featureFlags";

describe("featureFlags defaults", () => {
  it("enables live news by default", () => {
    expect(isLiveNewsEnabled()).toBe(true);
  });

  it("disables push alerts until explicitly enabled", () => {
    expect(isPushAlertsEnabled()).toBe(false);
  });

  it("keeps free image generation enabled by default for backward compatibility", () => {
    expect(isFreeImageGenerationEnabled()).toBe(true);
  });

  it("requires subscription for OpenAI images by default", () => {
    expect(openAiImageRequiresSubscription()).toBe(true);
  });
});
