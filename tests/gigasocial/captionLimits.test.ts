import { describe, expect, it } from "vitest";
import {
  BLOG_POST_MAX_LENGTH,
  SOCIAL_CAPTION_MAX_LENGTH,
  socialCaptionMaxLength,
} from "../../web/lib/gigasocial/constants";

describe("social caption limits", () => {
  it("keeps short posts at 4000 characters", () => {
    expect(SOCIAL_CAPTION_MAX_LENGTH).toBe(4000);
    expect(socialCaptionMaxLength("text")).toBe(4000);
    expect(socialCaptionMaxLength("creator")).toBe(4000);
  });

  it("allows 6000 characters for education/blog posts", () => {
    expect(BLOG_POST_MAX_LENGTH).toBe(6000);
    expect(socialCaptionMaxLength("education")).toBe(6000);
  });
});
