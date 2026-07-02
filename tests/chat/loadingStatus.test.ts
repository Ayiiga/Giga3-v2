import { describe, expect, it } from "vitest";
import {
  CHAT_LOADING_STAGE_BOUNDARIES,
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

  it("shows Generating only in replying phase", () => {
    expect(chatLoadingStageLabel(0, false, "replying")).toBe("Generating response…");
    expect(chatLoadingStageLabel(60_000, false, "replying")).toBe("Generating response…");
  });

  it("appends slow hints per phase", () => {
    expect(chatLoadingStageLabel(1500, true, "sending")).toBe("Sending your message…");
    expect(chatLoadingStageLabel(4000, true, "sending")).toContain("still sending");
    expect(chatLoadingStageLabel(0, true, "replying")).toContain("Generating response…");
    expect(chatLoadingStageLabel(0, true, "replying")).toContain("slow connection");
  });

  it("never returns an empty label (no blank spinner)", () => {
    for (const ms of [-100, 0, 100, 3000, 50_000]) {
      expect(chatLoadingStageLabel(ms, false, "sending").length).toBeGreaterThan(0);
      expect(chatLoadingStageLabel(ms, false, "replying").length).toBeGreaterThan(0);
    }
  });

  it("exposes boundaries for the sending stages", () => {
    expect(CHAT_LOADING_STAGE_BOUNDARIES).toEqual([1500, 4000]);
  });
});
