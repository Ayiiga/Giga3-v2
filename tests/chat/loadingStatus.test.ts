import { describe, expect, it } from "vitest";
import {
  CHAT_LOADING_STAGE_BOUNDARIES,
  chatLoadingStageLabel,
} from "../../web/lib/chat/loadingStatus";

describe("chatLoadingStageLabel", () => {
  it("starts with Connecting…", () => {
    expect(chatLoadingStageLabel(0)).toBe("Connecting…");
    expect(chatLoadingStageLabel(1499)).toBe("Connecting…");
  });

  it("advances through the stages as time passes", () => {
    expect(chatLoadingStageLabel(0)).toBe("Connecting…");
    expect(chatLoadingStageLabel(1500)).toBe("Sending your message…");
    expect(chatLoadingStageLabel(4000)).toBe("Waiting for Giga3…");
    expect(chatLoadingStageLabel(9000)).toBe("Generating response…");
    expect(chatLoadingStageLabel(60_000)).toBe("Generating response…");
  });

  it("appends a slow-connection hint on the final stage only", () => {
    expect(chatLoadingStageLabel(1500, true)).toBe("Sending your message…");
    expect(chatLoadingStageLabel(9000, true)).toContain("Generating response…");
    expect(chatLoadingStageLabel(9000, true)).toContain("slow connection");
  });

  it("never returns an empty label (no blank spinner)", () => {
    for (const ms of [-100, 0, 100, 3000, 50_000]) {
      expect(chatLoadingStageLabel(ms).length).toBeGreaterThan(0);
    }
  });

  it("exposes boundaries that match the stage transitions", () => {
    expect(CHAT_LOADING_STAGE_BOUNDARIES).toEqual([1500, 4000, 9000]);
  });
});
