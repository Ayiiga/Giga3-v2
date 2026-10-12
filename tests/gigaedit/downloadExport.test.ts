/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const shareFilesMock = vi.fn();
const triggerDownloadMock = vi.fn();

vi.mock("../../web/lib/share/clientShare", () => ({
  shareFiles: (...args: unknown[]) => shareFilesMock(...args),
  triggerDownload: (...args: unknown[]) => triggerDownloadMock(...args),
}));

import { saveExportedFileToDevice } from "../../web/lib/gigaedit/downloadExport";
import {
  shouldAutoOfferCreatorSurvey,
  surveyExportPrefillFromOutcome,
} from "../../web/lib/gigaedit/creatorSurvey";

function sampleFile() {
  return new File([new Uint8Array([1, 2, 3])], "clip.mp4", { type: "video/mp4" });
}

describe("saveExportedFileToDevice — honest outcomes", () => {
  beforeEach(() => {
    shareFilesMock.mockReset();
    triggerDownloadMock.mockReset();
    triggerDownloadMock.mockReturnValue({ ok: true });
  });

  it("returns shared when the share sheet completes without abort", async () => {
    shareFilesMock.mockResolvedValue({ ok: true });
    const result = await saveExportedFileToDevice(sampleFile());
    expect(result).toEqual({ outcome: "shared" });
    expect(triggerDownloadMock).not.toHaveBeenCalled();
    expect(shouldAutoOfferCreatorSurvey(result.outcome)).toBe(true);
    expect(surveyExportPrefillFromOutcome(result.outcome)).toBe("not_confirmed");
  });

  it("returns cancelled on share abort and does not fall through to download", async () => {
    shareFilesMock.mockResolvedValue({ ok: false, reason: "Share cancelled" });
    const result = await saveExportedFileToDevice(sampleFile());
    expect(result).toEqual({ outcome: "cancelled" });
    expect(triggerDownloadMock).not.toHaveBeenCalled();
    expect(shouldAutoOfferCreatorSurvey(result.outcome)).toBe(false);
    expect(surveyExportPrefillFromOutcome(result.outcome)).toBe("not_attempted");
  });

  it("falls back to download when share is unavailable (not cancelled)", async () => {
    shareFilesMock.mockResolvedValue({
      ok: false,
      reason: "Sharing files is not supported here — try Save instead",
    });
    const result = await saveExportedFileToDevice(sampleFile());
    expect(result).toEqual({ outcome: "downloaded" });
    expect(triggerDownloadMock).toHaveBeenCalledTimes(1);
    expect(shouldAutoOfferCreatorSurvey(result.outcome)).toBe(true);
    expect(surveyExportPrefillFromOutcome(result.outcome)).toBe("not_confirmed");
  });

  it("throws on empty file (failed save)", async () => {
    const empty = new File([], "empty.mp4", { type: "video/mp4" });
    await expect(saveExportedFileToDevice(empty)).rejects.toThrow(/empty/i);
    expect(shareFilesMock).not.toHaveBeenCalled();
  });

  it("throws when fallback download fails", async () => {
    shareFilesMock.mockResolvedValue({ ok: false, reason: "not supported" });
    triggerDownloadMock.mockReturnValue({ ok: false, reason: "Download failed." });
    await expect(saveExportedFileToDevice(sampleFile())).rejects.toThrow(/Download failed/);
  });

  it("never auto-prefills survey export=Yes from device-save outcomes", () => {
    for (const outcome of ["shared", "downloaded", "cancelled"] as const) {
      expect(surveyExportPrefillFromOutcome(outcome)).not.toBe("yes");
    }
    expect(surveyExportPrefillFromOutcome(null)).toBe("not_attempted");
  });
});
