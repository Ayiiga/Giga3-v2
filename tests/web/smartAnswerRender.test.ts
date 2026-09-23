import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "../../web/node_modules/react";
import { renderToStaticMarkup } from "../../web/node_modules/react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageBubble } from "../../web/components/chat/MessageBubble";
import { MessageMarkdown } from "../../web/components/chat/MessageMarkdown";
import { SmartAnswer } from "../../web/components/chat/SmartAnswer";
import { parseSmartAnswer } from "../../web/lib/chat/parseSmartAnswer";

function smartHtml(content: string, messageId = "msg-1"): string {
  const parsed = parseSmartAnswer(content);
  expect(parsed.isSmart).toBe(true);
  return renderToStaticMarkup(createElement(SmartAnswer, { messageId, parsed }));
}

const STRUCTURED = [
  "## ⚡ Quick Answer",
  "**Accra** is the capital of Ghana.",
  "",
  "## 📘 Simple Definition",
  "A capital is the city where a country's government sits.",
  "",
  "## 🔑 Key Points",
  "- **Accra** is on the Gulf of Guinea.",
  "- It is Ghana's largest city.",
  "",
  "## 🌍 Real-World Example",
  "Travelers flying into Kotoka land in Accra.",
  "",
  "See [GigaLearn](/learn/) for more.",
].join("\n");

describe("Smart Answer rendering", () => {
  it("renders labeled sections, bold keywords, bullets, and markdown links", () => {
    const html = smartHtml(STRUCTURED);
    expect(html).toContain("smart-answer");
    expect(html).toContain("Quick Answer");
    expect(html).toContain("Simple Definition");
    expect(html).toContain("Key Points");
    expect(html).toContain("Real-World Example");
    expect(html).toContain('class="chat-md-strong"');
    expect(html).toContain("Accra");
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
    expect(html).toContain('href="/learn/"');
    expect(html).toContain('aria-labelledby="smart-answer-msg-1-quick-0"');
    expect(html).toContain("<h2");
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("smart-answer__section--practice");
  });

  it("omits empty sections from the markup", () => {
    const html = smartHtml(
      ["## ⚡ Quick Answer", "", "## 📘 Simple Definition", "A verb is a doing word.", "", "## 🚀 Next Step"].join(
        "\n"
      )
    );
    expect(html).toContain("Simple Definition");
    expect(html).not.toContain("Quick Answer");
    expect(html).not.toContain("Next Step");
  });

  it("renders partial structured content without throwing", () => {
    const html = smartHtml(
      ["## ⚡ Quick Answer", "Accra is the capital.", "", "## 📘", "unfinished label", "", "```js", "const city = 'Accra';"].join(
        "\n"
      )
    );
    expect(html).toContain("smart-answer__section--quick");
    expect(html).toContain("unfinished label");
    expect(html).toContain("chat-md-pre");
  });

  it("renders a long reply inside the reading column", () => {
    const bullets = Array.from({ length: 30 }, (_, index) => `- Detail ${index + 1} with **keyword**`).join("\n");
    const html = smartHtml(["## 🧠 More Complete Explanation", bullets, "", "## 🚀 Next Step", "Review one bullet aloud."].join("\n"));
    expect(html).toContain("Detail 30");
    expect(html).toContain("smart-answer__section--explanation");
    expect(html).toContain("smart-answer__section--next");
    expect(html).not.toContain("width:");
  });

  it("keeps body headings below the section heading", () => {
    const html = renderToStaticMarkup(
      createElement(MessageMarkdown, { content: "# Too big\n\n### Nested", headingFloor: 3 })
    );
    expect(html).toContain("<h3");
    expect(html).not.toContain("<h1");
    expect(html).toContain("chat-md-h3");
  });

  it("keeps a plain chat message on the existing markdown renderer", () => {
    const html = renderToStaticMarkup(
      createElement(MessageBubble, {
        id: "legacy-1",
        role: "assistant",
        content: "Here is a short answer about Ghana.",
      })
    );
    expect(html).toContain("chat-markdown");
    expect(html).toContain("Here is a short answer about Ghana.");
    expect(html).not.toContain("smart-answer");
    expect(html).not.toContain("answer-content-block");
  });

  it("keeps an older introduction / main / conclusion reply on answer blocks", () => {
    const html = renderToStaticMarkup(
      createElement(MessageBubble, {
        id: "legacy-2",
        role: "assistant",
        content: [
          "## Introduction",
          "Ghana is expanding solar power for clinics and classrooms.",
          "",
          "## Main message",
          "Storage still decides whether evening voltage holds in rural communities.",
          "",
          "## Conclusion",
          "Pair new panels with batteries before the next school term.",
        ].join("\n"),
      })
    );
    expect(html).toContain("answer-content-block");
    expect(html).toContain("Introduction");
    expect(html).toContain("Main message");
    expect(html).not.toContain("smart-answer");
  });

  it("renders a Smart Answer inside the chat bubble", () => {
    const html = renderToStaticMarkup(
      createElement(MessageBubble, {
        id: "smart-9",
        role: "assistant",
        content: STRUCTURED,
      })
    );
    expect(html).toContain("smart-answer");
    expect(html).toContain("smart-answer-smart-9-quick-0");
    expect(html).toContain("chat-md-strong");
    expect(html).not.toContain("answer-content-block");
  });

  it("defines a compact mobile layout without horizontal overflow", () => {
    const premium = readFileSync(resolve(__dirname, "../../web/styles/chat-premium.css"), "utf8");
    const overflow = readFileSync(resolve(__dirname, "../../web/styles/chat-overflow.css"), "utf8");
    expect(premium).toContain("@media (max-width: 639px)");
    expect(premium).toContain(".smart-answer");
    expect(premium).toMatch(/max-width:\s*min\(42rem,\s*100%\)/);
    expect(premium).toContain("overflow-wrap: anywhere");
    expect(overflow).toContain(".smart-answer");
    expect(overflow).toContain("max-width: 100%");
    expect(overflow).toContain("min-width: 0");
  });
});
