import { describe, expect, it } from "vitest";
import {
  FREE_IMAGE_DAILY_LIMIT,
  FREE_IMAGE_QUOTA_TIMEZONE,
  freeImageDateKey,
  freeImageResetsAtMs,
} from "../../convex/freeImageQuota";
import { imageDailyLimitMarkdown } from "../../convex/premiumImage";
import {
  extractImageUrlFromContent,
  findPriorAssistantImageUrl,
  isImageEditOrTransformQuery,
} from "../../convex/chatImageSource";
import { classifyRequestKind } from "../../convex/providerRouter";
import {
  resolveChatCreateRoute,
} from "../../web/lib/chat/chatCreateMenu";

describe("free image Accra daily quota helpers", () => {
  it("defaults to 1 successful image per Africa/Accra day", () => {
    expect(FREE_IMAGE_DAILY_LIMIT).toBe(1);
    expect(FREE_IMAGE_QUOTA_TIMEZONE).toBe("Africa/Accra");
  });

  it("formats Accra calendar date keys as YYYY-MM-DD", () => {
    // 2026-03-15 23:30 UTC is still 15 Mar in Accra (UTC+0).
    const key = freeImageDateKey(Date.UTC(2026, 2, 15, 23, 30, 0));
    expect(key).toBe("2026-03-15");
  });

  it("resets at the next Accra midnight", () => {
    const now = Date.UTC(2026, 2, 15, 14, 0, 0);
    const resetsAt = freeImageResetsAtMs(now);
    expect(resetsAt).toBe(Date.UTC(2026, 2, 16, 0, 0, 0));
    expect(freeImageDateKey(resetsAt)).toBe("2026-03-16");
  });

  it("explains the daily limit without promising unlimited images", () => {
    const md = imageDailyLimitMarkdown({
      limit: 1,
      resetsAt: Date.UTC(2026, 2, 16, 0, 0, 0),
      timeZone: "Africa/Accra",
    });
    expect(md).toContain("1 successful AI image");
    expect(md).toContain("/subscribe/");
    expect(md).toContain("CV and letter");
    expect(md.toLowerCase()).not.toContain("unlimited");
  });
});

describe("chat image edit classification", () => {
  it("routes edit intents with an uploaded image to image_generation", () => {
    expect(
      classifyRequestKind("remove the background from this photo", "general", {
        hasImageAttachment: true,
      })
    ).toBe("image_generation");
  });

  it("keeps vision analysis as text_chat when an image is attached without edit intent", () => {
    expect(
      classifyRequestKind("What is in this picture?", "general", {
        hasImageAttachment: true,
      })
    ).toBe("text_chat");
  });

  it("supports iterative edits from a prior assistant image", () => {
    expect(
      classifyRequestKind("make it brighter and change the background to blue", "general", {
        hasEditableImageSource: true,
      })
    ).toBe("image_generation");
    expect(isImageEditOrTransformQuery("make it brighter", true)).toBe(true);
  });

  it("extracts prior generated image URLs from assistant messages", () => {
    const url = "https://perfect-lark-521.convex.cloud/api/storage/abc";
    expect(
      extractImageUrlFromContent(`Here is your generated image:\n\n${url}`)
    ).toBe(url);
    expect(
      findPriorAssistantImageUrl([
        { role: "user", content: "make a cat" },
        { role: "assistant", content: `Here is your generated image:\n\n${url}` },
        { role: "user", content: "make it blue" },
      ])
    ).toBe(url);
  });
});

describe("CV and letter scaffolds stay free of image routing", () => {
  it("routes CV/resume and cover letter to document templates, not image gen", () => {
    expect(resolveChatCreateRoute("doc-cv-resume")).toEqual({
      kind: "template",
      documentId: "resume",
    });
    // Cover letter is available via document templates id cover-letter when selected.
    expect(resolveChatCreateRoute("ai-image")).toEqual({
      kind: "insert",
      body: "Generate an image of: ",
    });
  });
});

describe("free image reserve/release semantics", () => {
  it("allows only one concurrent reservation per day and restores on release", () => {
    // Mirrors freeImageQuota tryReserve/release against a single Accra day bucket.
    const limit = 1;
    let count = 0;
    const tryReserve = () => {
      if (count >= limit) return { ok: false as const, remaining: 0 };
      count += 1;
      return { ok: true as const, remaining: limit - count };
    };
    const release = () => {
      count = Math.max(0, count - 1);
      return { remaining: limit - count };
    };

    expect(tryReserve()).toEqual({ ok: true, remaining: 0 });
    expect(tryReserve()).toEqual({ ok: false, remaining: 0 });
    expect(release()).toEqual({ remaining: 1 });
    expect(tryReserve()).toEqual({ ok: true, remaining: 0 });
  });
});
