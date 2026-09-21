import { createElement } from "../../web/node_modules/react";
import { renderToStaticMarkup } from "../../web/node_modules/react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageMarkdown } from "../../web/components/chat/MessageMarkdown";

function htmlFor(content: string): string {
  return renderToStaticMarkup(createElement(MessageMarkdown, { content }));
}

describe("MessageMarkdown markup", () => {
  it("renders emphasis, lists, headings, and safe links", () => {
    const html = htmlFor(
      [
        "### Important",
        "",
        "**Key fact** and *additional context*",
        "",
        "- First",
        "- Second",
        "",
        "1. Step one",
        "2. Step two",
        "",
        "See [Giga3](https://www.giga3ai.com/learn) and [bad](javascript:alert(1)).",
        "",
        "```js",
        "const x = 1;",
        "```",
        "",
        "| A | B |",
        "| --- | --- |",
        "| 1 | 2 |",
      ].join("\n")
    );

    expect(html).toContain("<h3");
    expect(html).toContain("chat-md-h3");
    expect(html).toContain("<strong");
    expect(html).toContain("chat-md-strong");
    expect(html).toContain("Key fact");
    expect(html).toContain("<em");
    expect(html).toContain("chat-md-em");
    expect(html).toContain("<ul");
    expect(html).toContain("<ol");
    expect(html).toContain("Step one");
    expect(html).toContain('href="https://www.giga3ai.com/learn"');
    expect(html).not.toContain("javascript:");
    expect(html).toContain("chat-md-pre");
    expect(html).toContain("hl-keyword");
    expect(html).toContain("<table");
    expect(html).toContain("<th");
  });

  it("renders a long reply and incomplete streaming text without throwing", () => {
    const long = Array.from({ length: 40 }, (_, index) => `- Item ${index + 1} with **fact**`).join(
      "\n"
    );
    expect(() => htmlFor(long)).not.toThrow();
    const partial = htmlFor("Here is the **important\n\n- First item\n- Second");
    expect(partial).toContain("**important");
    expect(partial).toContain("First item");
    expect(partial).not.toContain("<strong");
  });
});
