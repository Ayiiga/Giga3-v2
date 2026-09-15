import { describe, expect, it } from "vitest";
import {
  GIGAEDIT_RECORDING_LINKS,
  buildGigaEditSectionHref,
  isGigaEditCaptureHref,
} from "../../web/lib/navigation/editsDestinations";
import { CREATOR_HOME_ACTIONS } from "../../web/lib/gigaedit/creatorStudio/homeActions";
import { GIGAEDIT_TOOL_CATALOG } from "../../web/lib/gigaedit/toolCatalog";

describe("GigaEdits recording destinations", () => {
  it("routes teleprompter and recording deep links to /gigaedit", () => {
    expect(GIGAEDIT_RECORDING_LINKS.teleprompter).toMatch(/^\/gigaedit/);
    expect(GIGAEDIT_RECORDING_LINKS.recordVideo).toContain("tab=teleprompter");
    expect(GIGAEDIT_RECORDING_LINKS.recordVideo).toContain("record=1");
    expect(GIGAEDIT_RECORDING_LINKS.recordVoice).toContain("tab=audio");
    expect(GIGAEDIT_RECORDING_LINKS.recordVoice).toContain("record=1");
    expect(buildGigaEditSectionHref("video")).toContain("/gigaedit");
  });

  it("never points capture tools at Media Studio", () => {
    const captureTools = GIGAEDIT_TOOL_CATALOG.filter(
      (t) => t.id === "teleprompter" || t.id === "audio-studio"
    );
    expect(captureTools.every((t) => t.kind === "section")).toBe(true);
    expect(captureTools.every((t) => t.kind !== "media")).toBe(true);

    const recordActions = CREATOR_HOME_ACTIONS.filter(
      (a) => a.id === "record-video" || a.id === "record-voice"
    );
    expect(recordActions.every((a) => a.kind === "section")).toBe(true);
    expect(recordActions.every((a) => a.section === "teleprompter" || a.section === "audio")).toBe(
      true
    );
  });

  it("detects gigaedit capture hrefs", () => {
    expect(isGigaEditCaptureHref("/gigaedit/?tab=teleprompter")).toBe(true);
    expect(isGigaEditCaptureHref("/gigaedit/?tab=audio&record=1")).toBe(true);
    expect(isGigaEditCaptureHref("/media/?tab=video")).toBe(false);
  });
});
