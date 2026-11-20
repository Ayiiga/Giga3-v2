import { describe, expect, it } from "vitest";
import { parseMessageMedia, splitUnrenderedPoster } from "../../web/lib/chat/parseMessageMedia";

describe("parseMessageMedia", () => {
  it("renders Convex storage URLs (no file extension) as images", () => {
    const content =
      "Here is your generated image:\n\nhttps://perfect-lark-521.convex.cloud/api/storage/65ef051a-de27-420b-81e8-8b0deb90f99c";
    const parsed = parseMessageMedia(content);
    expect(parsed.images).toEqual([
      "https://perfect-lark-521.convex.cloud/api/storage/65ef051a-de27-420b-81e8-8b0deb90f99c",
    ]);
    expect(parsed.text).toBe("Here is your generated image:");
  });

  it("still recognizes extension-based image URLs", () => {
    const parsed = parseMessageMedia("see https://cdn.example.com/pic.png here");
    expect(parsed.images).toContain("https://cdn.example.com/pic.png");
  });

  it("keeps plain prose free of media", () => {
    const parsed = parseMessageMedia("The capital of France is Paris.");
    expect(parsed.images).toEqual([]);
    expect(parsed.videos).toEqual([]);
    expect(parsed.text).toBe("The capital of France is Paris.");
  });
});

describe("unrendered poster responses", () => {
  it("isolates truncated poster JSON and leaves the written copy available", () => {
    const copy = "## Missing person\n\nPlease contact the family.";
    const content = copy + '\n\n{\n  "type": "poster", "title": "Missing Person", "image": { "url": "data:image/jpeg;base64,/9j/4AAQ';
    expect(splitUnrenderedPoster(content)).toBe(copy);
  });

  it("handles a JSON fence and a response with no poster copy", () => {
    const content = '```json\n{"kind":"poster","image":{"src":"data:image/png;base64,AAAA"}}\n```';
    expect(splitUnrenderedPoster(content)).toBe("");
  });

  it("leaves ordinary document text, visual specs and rendered image messages alone", () => {
    for (const content of [
      "Here is your generated image:\n\ndata:image/png;base64,AAAA",
      'Here is a catalogue.\n{"type":"poster","title":"Layout","sections":[]}',
      '\n{"type":"report","image":{"url":"data:image/jpeg;base64,AAAA"}}',
    ]) {
      expect(splitUnrenderedPoster(content)).toBeNull();
    }
  });
});


it("removes a legacy auto-generated poster diagram and JSON while keeping the reply text", () => {
  const intro = "### Giga3 AI\n\nWhat would you like to change?";
  const blocks = [
    "### Visual Aids", "", "```mermaid", "flowchart LR", "A --> B", "```", "",
    "```giga-visual", "{", '  "version": "1.0",', '  "kind": "poster",', '  "title": "Please redesign the poster"', "}", "```",
  ].join("\n");
  const footer = "Made with Giga3 AI";
  expect(splitUnrenderedPoster(intro + "\n\n" + blocks + "\n\n" + footer))
    .toBe(intro + "\n\n\n" + footer);
  expect(splitUnrenderedPoster(blocks.replace('  "kind": "poster",', '  "kind": "infographic",'))).toBeNull();
  expect(splitUnrenderedPoster(blocks.slice(blocks.indexOf("```giga-visual")))).toBeNull();
});
