import { describe, expect, it } from "vitest";
import { socialOutboxDedupeKey } from "../../web/lib/gigasocial/socialOutbox";

describe("social outbox conflict-safe dedupe", () => {
  it("collapses identical offline actions to one key", () => {
    const a = socialOutboxDedupeKey({
      action: "create_post",
      body: " Hello world ",
      postType: "text",
    });
    const b = socialOutboxDedupeKey({
      action: "create_post",
      body: "Hello world",
      postType: "text",
    });
    expect(a).toBe(b);
  });

  it("keeps like and unlike distinct from comments", () => {
    const like = socialOutboxDedupeKey({ action: "like", postId: "p1" });
    const comment = socialOutboxDedupeKey({
      action: "comment",
      postId: "p1",
      body: "nice",
    });
    expect(like).not.toBe(comment);
  });
});
