import { describe, expect, it } from "vitest";
import {
  destinationComposerSeed,
  privacyToSocialVisibility,
} from "../../web/lib/gigaedit/publishTypes";
import {
  canReuseSound,
  filterSounds,
  soundAttributionLine,
  type GigaEditSoundAsset,
} from "../../web/lib/gigaedit/soundLibrary";
import { GIGAEDIT_FEATURE_DEFAULTS } from "../../web/lib/gigaedit/featureFlags";
import { GIGAEDIT_OFFLINE_CAPABILITIES } from "../../web/lib/gigaedit/offline";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("GigaEdit publish privacy mapping", () => {
  it("maps privacy to social visibility without private posts", () => {
    expect(privacyToSocialVisibility("public_reusable")).toBe("public");
    expect(privacyToSocialVisibility("public_no_reuse")).toBe("public");
    expect(privacyToSocialVisibility("followers")).toBe("followers");
    expect(privacyToSocialVisibility("private")).toBeNull();
  });

  it("seeds reel/story composer destinations", () => {
    expect(destinationComposerSeed("reel").body).toContain("#reel");
    expect(destinationComposerSeed("story").action).toBe("story-content");
    expect(destinationComposerSeed("feed").action).toBe("text-post");
  });
});

describe("GigaEdit sound library helpers", () => {
  const base: GigaEditSoundAsset = {
    soundId: "snd_1",
    title: "Afrobeats Loop",
    creatorHandle: "ama",
    creatorDisplayName: "Ama",
    durationSec: 12,
    usageCount: 3,
    createdAt: 1,
    permission: "public_reusable",
    category: "original",
    favorite: true,
    aiGenerated: false,
    blobKey: "blob:snd_1",
  };

  it("attributes original creators", () => {
    expect(soundAttributionLine(base)).toBe("Original Sound by @ama");
  });

  it("respects reuse permissions", () => {
    expect(canReuseSound(base)).toBe(true);
    expect(canReuseSound({ ...base, permission: "public_no_reuse" })).toBe(false);
    expect(canReuseSound({ ...base, permission: "public_no_reuse" }, "ama")).toBe(true);
    expect(canReuseSound({ ...base, permission: "private" }, "other")).toBe(false);
  });

  it("filters by query and favorites", () => {
    const rows = filterSounds(
      [base, { ...base, soundId: "snd_2", title: "Quiet Night", favorite: false }],
      { query: "afro", category: "favorites" }
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].soundId).toBe("snd_1");
  });
});

describe("GigaEdit publish redirect helpers", () => {
  it("builds a feed publish URL with handoff flag", async () => {
    const { gigasocialPublishUrl } = await import("../../web/lib/gigaedit/publishHandoff");
    expect(gigasocialPublishUrl("feed")).toBe("/gigasocial/?tab=feed&gigaeditPublish=1");
    expect(gigasocialPublishUrl("reel")).toContain("gigaeditPublish=1");
  });

  it("wires Post to GigaSocial from editors", () => {
    const photo = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/PhotoEditor.tsx"),
      "utf8"
    );
    const video = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/VideoEditor.tsx"),
      "utf8"
    );
    expect(photo).toContain("handoffAndOpenGigaSocial");
    expect(video).toContain("handoffAndOpenGigaSocial");
    expect(photo).toContain("Post to GigaSocial");
    expect(video).toMatch(/Post to GigaSocial|readyToPublish|"Post"/);
  });
});

describe("GigaEdit publish flags & offline", () => {
  it("enables publish integration by default", () => {
    expect(GIGAEDIT_FEATURE_DEFAULTS.enableGigaEditPublish).toBe(true);
  });

  it("lists offline publish capabilities", () => {
    expect(GIGAEDIT_OFFLINE_CAPABILITIES).toEqual(
      expect.arrayContaining(["Queue posts for upload", "Use downloaded sounds"])
    );
  });

  it("bumps SW cache for publish integration", () => {
    const sw = readFileSync(resolve(__dirname, "../../web/public/sw.js"), "utf8");
    expect(sw).toContain('CACHE_NAME = "giga3-shell-v220-chat-latency"');
  });
});

describe("GigaEdit mobile stability", () => {
  it("avoids dvh height and hover transforms that shake mobile layouts", () => {
    const css = readFileSync(resolve(__dirname, "../../web/styles/gigaedit.css"), "utf8");
    expect(css).not.toContain("100dvh");
    expect(css).toContain("gigaedit-stable");
    expect(css).toContain("gigaedit-allow-effects");
    expect(css).toContain("transition: none");
  });
});
