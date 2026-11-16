import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatUploadedImagePreview } from "../../web/components/chat/ChatUploadedImagePreview";
import { parseMessageMedia } from "../../web/lib/chat/parseMessageMedia";
import { buildUserDisplayContent } from "../../web/lib/chat/multimodalAttachments";

const src = "data:image/png;base64,aGVsbG8=";

describe("chat uploaded attachment previews", () => {
  it("renders an inline thumbnail directly with accessible enlarge control", () => {
    const html = renderToStaticMarkup(
      createElement(ChatUploadedImagePreview, { src, index: 0 })
    );
    expect(html).toContain('src="data:image/png;base64,aGVsbG8="');
    expect(html).toContain("View attached image 1");
    expect(html).toContain("object-contain");
    expect(html).not.toContain("Tap to load image");
  });

  it("retains both images after saving a chat message", () => {
    const message = buildUserDisplayContent("Explain these", [
      { kind: "image", name: "one.png", sizeBytes: 80, thumbDataUrl: src },
      { kind: "image", name: "two.png", sizeBytes: 80, thumbDataUrl: src },
    ]);
    expect(message).toContain("Explain these");
    expect((message.match(/data:image\/png/g) ?? []).length).toBe(2);
    const media = parseMessageMedia(message);
    expect(media.images).toContain(src);
    expect(media.text).toContain("Explain these");
  });

  it("keeps original image payloads for vision while only redesigning display", () => {
    const input = readFileSync(resolve(__dirname, "../../web/components/chat/ChatInput.tsx"), "utf8");
    const bubble = readFileSync(resolve(__dirname, "../../web/components/chat/MessageBubble.tsx"), "utf8");
    expect(input).toContain("prepareChatAttachment(file, uploadUsage?.limits)");
    expect(input).toContain("onSend(displayContent, attachments)");
    expect(input).toContain("previewUrlsRef");
    expect(input).not.toContain("}, [attachments]);\n\n  // Ordinary text chat");
    expect(bubble).toContain("ChatUploadedImagePreview");
    expect(bubble).toContain("parsed.images.length > 0");
  });
});
