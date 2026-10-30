import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../../web/components/gigasocial/GigaSocialComposer.tsx", import.meta.url),
  "utf8"
);

function reviewBranch(): string {
  const start = source.indexOf("if (mediaReviewDraft) {");
  const end = source.indexOf("if (videoTrimDraft) {", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("GigaSocial media review Replace", () => {
  it("keeps the video and image file inputs mounted while the review screen is shown", () => {
    const branch = reviewBranch();
    expect(branch).toContain("ref={videoInputRef}");
    expect(branch).toContain("ref={imageInputRef}");
  });

  it("opens the picker without closing the review first, so the input ref is attached", () => {
    const branch = reviewBranch();
    const replaceStart = branch.indexOf("onReplace={() => {");
    expect(replaceStart).toBeGreaterThan(-1);
    const replaceBody = branch.slice(replaceStart, branch.indexOf("onSkip=", replaceStart));
    expect(replaceBody).not.toContain("setMediaReviewDraft(null)");
    expect(replaceBody).toContain("videoInputRef.current?.click()");
    expect(replaceBody).toContain("imageInputRef.current?.click()");
  });

  it("keeps the composer's main-screen video input in place", () => {
    const mainStart = source.indexOf("if (videoTrimDraft) {");
    expect(source.slice(mainStart)).toContain("ref={videoInputRef}");
  });
});
