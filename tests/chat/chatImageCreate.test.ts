import { describe, expect, it } from "vitest";
import { buildChatImageGenerationMessage } from "../../web/lib/chat/chatImageCreate";
import { resolveChatCreateRoute } from "../../web/lib/chat/chatCreateMenu";

describe("chat image generation UX", () => {
  it("builds a server-routable image generation message", () => {
    const message = buildChatImageGenerationMessage("a Ghanaian couple at a beautiful wedding", {
      aspectRatio: "16:9",
      quality: "high",
    });
    expect(message).toMatch(/^Create an image of /i);
    expect(message).toContain("Ghanaian couple");
    expect(message).toContain("16:9");
    expect(message).toContain("high detail");
  });

  it("routes Create image menu action to image mode", () => {
    expect(resolveChatCreateRoute("chat-create-image")).toEqual({ kind: "image-mode" });
  });
});
