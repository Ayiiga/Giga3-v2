import { describe, expect, it } from "vitest";
import { parseMarkdownDocument } from "../../web/lib/chat/messageMarkdownParser";

describe("parseMarkdownDocument ordered lists", () => {
  it("keeps one ordered list across blank lines between items", () => {
    const blocks = parseMarkdownDocument("1. First\n\n2. Second\n\n3. Third");
    expect(blocks).toEqual([
      {
        type: "ol",
        items: [
          { content: "First" },
          { content: "Second" },
          { content: "Third" },
        ],
      },
    ]);
  });

  it("normalizes skipped source numbers into sequential list items", () => {
    const blocks = parseMarkdownDocument("1. Alpha\n3. Beta\n5. Gamma");
    expect(blocks).toEqual([
      {
        type: "ol",
        items: [
          { content: "Alpha" },
          { content: "Beta" },
          { content: "Gamma" },
        ],
      },
    ]);
  });

  it("normalizes duplicate source numbers into one list", () => {
    const blocks = parseMarkdownDocument("1. One\n1. Two\n1. Three");
    expect(blocks).toEqual([
      {
        type: "ol",
        items: [{ content: "One" }, { content: "Two" }, { content: "Three" }],
      },
    ]);
  });

  it("parses nested bullet lists under ordered items", () => {
    const blocks = parseMarkdownDocument(
      "1. Parent\n   - child one\n   - child two\n2. Next"
    );
    expect(blocks).toEqual([
      {
        type: "ol",
        items: [
          {
            content: "Parent",
            children: [
              {
                type: "ul",
                items: [{ content: "child one" }, { content: "child two" }],
              },
            ],
          },
          { content: "Next" },
        ],
      },
    ]);
  });

  it("parses nested ordered lists under ordered items", () => {
    const blocks = parseMarkdownDocument(
      "1. Step one\n   1. Sub-step A\n   2. Sub-step B\n2. Step two"
    );
    expect(blocks).toEqual([
      {
        type: "ol",
        items: [
          {
            content: "Step one",
            children: [
              {
                type: "ol",
                items: [{ content: "Sub-step A" }, { content: "Sub-step B" }],
              },
            ],
          },
          { content: "Step two" },
        ],
      },
    ]);
  });

  it("ends the list when a paragraph interrupts", () => {
    const blocks = parseMarkdownDocument("1. First\n\nNot a list item\n\n1. Restart");
    expect(blocks).toEqual([
      { type: "ol", items: [{ content: "First" }] },
      { type: "paragraph", text: "Not a list item" },
      { type: "ol", items: [{ content: "Restart" }] },
    ]);
  });
});

describe("parseMarkdownDocument unordered lists", () => {
  it("keeps one bullet list across blank lines", () => {
    const blocks = parseMarkdownDocument("- Alpha\n\n- Beta");
    expect(blocks).toEqual([
      { type: "ul", items: [{ content: "Alpha" }, { content: "Beta" }] },
    ]);
  });
});

describe("parseMarkdownDocument other blocks", () => {
  it("parses headings, code fences, and paragraphs", () => {
    const blocks = parseMarkdownDocument(
      "## Title\n\nHello **world**.\n\n```js\nconst x = 1;\n```"
    );
    expect(blocks).toEqual([
      { type: "heading", level: 2, text: "Title" },
      { type: "paragraph", text: "Hello **world**." },
      { type: "code", language: "js", code: "const x = 1;" },
    ]);
  });

  it("parses markdown tables", () => {
    const blocks = parseMarkdownDocument(
      "| A | B |\n| --- | --- |\n| 1 | 2 |"
    );
    expect(blocks).toEqual([
      { type: "table", headers: ["A", "B"], rows: [["1", "2"]] },
    ]);
  });
});
