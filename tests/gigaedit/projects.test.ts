import { describe, expect, it } from "vitest";
import { computeProjectDurationSec } from "../../web/lib/gigaedit/creatorStudio/projectSummary";
import { GIGAEDIT_BRAND_KIT_STORE_ID } from "../../web/lib/gigaedit/creatorStudio/brandKit";
import type { GigaEditProjectRecord } from "../../web/lib/gigaedit/projects";

describe("gigaedit projects", () => {
  it("computeProjectDurationSec tolerates missing clips (brand kit row shape)", () => {
    const malformed = {
      id: GIGAEDIT_BRAND_KIT_STORE_ID,
      title: "Giga3 AI",
      updatedAt: Date.now(),
    } as GigaEditProjectRecord;

    expect(computeProjectDurationSec(malformed)).toBe(0);
  });

  it("computeProjectDurationSec uses clip timeline when durationSec unset", () => {
    const project = {
      id: "ge_test",
      title: "Test",
      kind: "video",
      status: "draft",
      createdAt: 1,
      updatedAt: 2,
      aspectRatio: "9:16",
      aiAssisted: false,
      hasOriginal: false,
      clips: [
        {
          id: "c1",
          track: "video",
          label: "A",
          startSec: 0,
          endSec: 12,
          speed: 1,
          rotateDeg: 0,
          filterId: "none",
          videoLayer: 0,
        },
      ],
    } as GigaEditProjectRecord;

    expect(computeProjectDurationSec(project)).toBe(12);
  });
});
