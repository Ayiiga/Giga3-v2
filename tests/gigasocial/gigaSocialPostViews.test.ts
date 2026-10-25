import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  hasRecordedPostView,
  markPostViewRecorded,
  shouldRecordPostViewImpression,
  SOCIAL_POST_VIEW_STORAGE_KEY,
} from "../../web/lib/gigasocial/postViewTracking";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("GigaSocial post view tracking helpers", () => {
  it("dedupes recorded post ids in session storage", () => {
    const storage = memoryStorage();
    expect(hasRecordedPostView("post-a", storage)).toBe(false);
    markPostViewRecorded("post-a", storage);
    expect(hasRecordedPostView("post-a", storage)).toBe(true);
    markPostViewRecorded("post-a", storage);
    const raw = storage.getItem(SOCIAL_POST_VIEW_STORAGE_KEY);
    expect(JSON.parse(raw!)).toEqual(["post-a"]);
  });

  it("requires in-view dwell before recording", () => {
    expect(
      shouldRecordPostViewImpression({
        postId: "p1",
        alreadyRecorded: false,
        inView: true,
        dwellMs: 749,
        requiredDwellMs: 750,
      })
    ).toBe(false);
    expect(
      shouldRecordPostViewImpression({
        postId: "p1",
        alreadyRecorded: false,
        inView: true,
        dwellMs: 750,
        requiredDwellMs: 750,
      })
    ).toBe(true);
    expect(
      shouldRecordPostViewImpression({
        postId: "p1",
        alreadyRecorded: true,
        inView: true,
        dwellMs: 900,
        requiredDwellMs: 750,
      })
    ).toBe(false);
  });
});

describe("GigaSocial post view wiring", () => {
  const gigaSocialSrc = readFileSync(
    resolve(__dirname, "../../convex/gigaSocial.ts"),
    "utf8"
  );
  const viewsSrc = readFileSync(
    resolve(__dirname, "../../convex/gigaSocialViews.ts"),
    "utf8"
  );
  const postCardSrc = readFileSync(
    resolve(__dirname, "../../web/components/gigasocial/GigaSocialPostCard.tsx"),
    "utf8"
  );
  const publicPostSrc = readFileSync(
    resolve(__dirname, "../../web/components/gigasocial/GigaSocialPublicPostClient.tsx"),
    "utf8"
  );
  const hookSrc = readFileSync(
    resolve(__dirname, "../../web/hooks/useRecordGigaSocialPostView.ts"),
    "utf8"
  );

  it("counts views for all non-deleted posts (including followers-only)", () => {
    const start = gigaSocialSrc.indexOf("export const recordPostView");
    expect(start).toBeGreaterThan(-1);
    const slice = gigaSocialSrc.slice(start, start + 900);
    expect(slice).toContain("if (!post || post.deletedAt) return { ok: false }");
    expect(slice).not.toContain('visibility === "followers"');
  });

  it("normalizes missing viewCount to 0 in public post projection", () => {
    expect(viewsSrc).toContain("viewCount: post.viewCount ?? 0");
  });

  it("records feed impressions from PostCard via dwell hook", () => {
    expect(postCardSrc).toContain("useRecordGigaSocialPostView");
    expect(postCardSrc).toContain("ref={viewRef}");
    expect(postCardSrc).toContain("aria-label={`${viewCount} views`}");
    expect(hookSrc).toContain("api.gigaSocial.recordPostView");
    expect(hookSrc).toContain("IntersectionObserver");
    expect(hookSrc).toContain("markPostViewRecorded");
  });

  it("dedupes public post page views against feed impressions", () => {
    expect(publicPostSrc).toContain("hasRecordedPostView");
    expect(publicPostSrc).toContain("markPostViewRecorded");
    expect(publicPostSrc).toContain("api.gigaSocial.recordPostView");
  });
});
