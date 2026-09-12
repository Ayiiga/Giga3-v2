import { describe, expect, it } from "vitest";
import { shouldUseQuickConversationalReply } from "../../web/lib/chat/quickReplyRouting";

describe("quick conversational reply routing", () => {
  it("uses quick reply for greetings without live web", () => {
    expect(
      shouldUseQuickConversationalReply({
        query: "Hello",
      })
    ).toBe(true);
    expect(
      shouldUseQuickConversationalReply({
        query: "Hi",
      })
    ).toBe(true);
  });

  it("does not use quick reply for current-events questions", () => {
    expect(
      shouldUseQuickConversationalReply({
        query: "What is happening in Ghana and Nepal",
      })
    ).toBe(false);
  });
});
