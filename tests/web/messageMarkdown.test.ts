import { describe, expect, it } from "vitest";
import {
  parseInlineMarkdown,
  parseMarkdownDocument,
  safeMarkdownHref,
  safeParseMarkdownDocument,
} from "../../web/lib/chat/messageMarkdownParser";

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

  it("keeps fenced code as a code block, including markdown-looking text", () => {
    const blocks = parseMarkdownDocument("```js\nconst label = '**not bold**';\n```");
    expect(blocks).toEqual([
      { type: "code", language: "js", code: "const label = '**not bold**';" },
    ]);
  });
});

describe("chat markdown inline rendering", () => {
  it("renders bold, italic, and links without unsafe URL schemes", () => {
    expect(parseInlineMarkdown("**Bold text**")).toEqual([
      { type: "strong", children: [{ type: "text", text: "Bold text" }] },
    ]);
    expect(parseInlineMarkdown("*Italic text*")).toEqual([
      { type: "em", children: [{ type: "text", text: "Italic text" }] },
    ]);
    expect(parseInlineMarkdown("See [docs](https://www.giga3ai.com/learn)")).toEqual([
      { type: "text", text: "See " },
      {
        type: "link",
        href: "https://www.giga3ai.com/learn",
        children: [{ type: "text", text: "docs" }],
      },
    ]);
    expect(safeMarkdownHref("javascript:alert(1)")).toBeNull();
    expect(safeMarkdownHref("data:text/html,hi")).toBeNull();
    expect(parseInlineMarkdown("[click](javascript:alert(1))")).toEqual([
      {
        type: "link",
        href: null,
        children: [{ type: "text", text: "click" }],
      },
    ]);
    expect(parseInlineMarkdown("Plain sentence with no markers.")).toEqual([
      { type: "text", text: "Plain sentence with no markers." },
    ]);
  });

  it("renders combined heading, emphasis, and list markers as blocks plus inline", () => {
    const blocks = parseMarkdownDocument(
      [
        "### Important",
        "",
        "**Key fact**",
        "",
        "*Additional context*",
        "",
        "- First",
        "- Second",
        "",
        "1. Step one",
        "2. Step two",
      ].join("\n")
    );
    expect(blocks.map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
      "paragraph",
      "ul",
      "ol",
    ]);
    expect(blocks[0]).toMatchObject({ type: "heading", level: 3, text: "Important" });
    expect(parseInlineMarkdown("**Key fact**")[0]).toMatchObject({ type: "strong" });
    expect(parseInlineMarkdown("*Additional context*")[0]).toMatchObject({ type: "em" });
    expect(blocks[3]).toMatchObject({
      type: "ul",
      items: [{ content: "First" }, { content: "Second" }],
    });
    expect(blocks[4]).toMatchObject({
      type: "ol",
      items: [{ content: "Step one" }, { content: "Step two" }],
    });
  });

  it("keeps incomplete streaming markdown as text without throwing", () => {
    expect(() => parseInlineMarkdown("Here is the **important")).not.toThrow();
    expect(parseInlineMarkdown("Here is the **important")).toEqual([
      { type: "text", text: "Here is the **important" },
    ]);
    expect(() => safeParseMarkdownDocument("- First item\n- Second")).not.toThrow();
    const partial = safeParseMarkdownDocument("- First item\n- Second");
    expect(partial).toEqual([
      { type: "ul", items: [{ content: "First item" }, { content: "Second" }] },
    ]);
    expect(() => safeParseMarkdownDocument("### Key Information\n\n**open")).not.toThrow();
    expect(safeParseMarkdownDocument(null)).toEqual([]);
  });
});
