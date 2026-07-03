import { describe, expect, it } from "vitest";
import {
  CHAT_LOADING_STAGE_BOUNDARIES,
  CHAT_REPLYING_STAGE_BOUNDARIES,
  chatLoadingStageLabel,
} from "../../web/lib/chat/loadingStatus";

describe("chatLoadingStageLabel", () => {
  it("starts with Connecting… while sending", () => {
    expect(chatLoadingStageLabel(0, false, "sending")).toBe("Connecting…");
    expect(chatLoadingStageLabel(1499, false, "sending")).toBe("Connecting…");
  });

  it("advances through sending stages without reaching Generating", () => {
    expect(chatLoadingStageLabel(0, false, "sending")).toBe("Connecting…");
    expect(chatLoadingStageLabel(1500, false, "sending")).toBe("Sending your message…");
    expect(chatLoadingStageLabel(4000, false, "sending")).toBe("Waiting for Giga3…");
    expect(chatLoadingStageLabel(60_000, false, "sending")).toBe("Waiting for Giga3…");
  });

  it("shows Generating only in replying phase at first", () => {
    expect(chatLoadingStageLabel(0, false, "replying")).toBe("Generating response…");
    expect(chatLoadingStageLabel(11_999, false, "replying")).toBe("Generating response…");
  });

  it("advances through replying stages on long waits", () => {
    expect(chatLoadingStageLabel(12_000, false, "replying")).toBe("Still working on it…");
    expect(chatLoadingStageLabel(30_000, false, "replying")).toBe("Taking a bit longer…");
    expect(chatLoadingStageLabel(60_000, false, "replying")).toBe("Almost there…");
  });

  it("does not append slow-network suffix text", () => {
    expect(chatLoadingStageLabel(4000, true, "sending")).toBe("Waiting for Giga3…");
    expect(chatLoadingStageLabel(0, true, "replying")).toBe("Generating response…");
    expect(chatLoadingStageLabel(30_000, true, "replying")).toBe("Taking a bit longer…");
  });

  it("never returns an empty label (no blank spinner)", () => {
    for (const ms of [-100, 0, 100, 3000, 50_000]) {
      expect(chatLoadingStageLabel(ms, false, "sending").length).toBeGreaterThan(0);
      expect(chatLoadingStageLabel(ms, false, "replying").length).toBeGreaterThan(0);
    }
  });

  it("exposes boundaries for the sending and replying stages", () => {
    expect(CHAT_LOADING_STAGE_BOUNDARIES).toEqual([1500, 4000]);
    expect(CHAT_REPLYING_STAGE_BOUNDARIES).toEqual([12_000, 30_000, 60_000]);
  });
});
