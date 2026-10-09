import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("compact Readers and Sources UI", () => {
  it("keeps AfricanVoiceReader collapsed behind a Change voice control", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/chat/AfricanVoiceReader.tsx"),
      "utf8"
    );
    expect(src).toContain("Change voice");
    expect(src).toContain("aria-expanded={open}");
    expect(src).toContain("AFRICAN_READER_VOICES.map");
    // Voices render only when the picker is open — not an always-visible pill strip.
    expect(src).toMatch(/\{open \? \([\s\S]*AFRICAN_READER_VOICES\.map/);
  });

  it("keeps LiveWebSourceCards collapsed behind a Read more control", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/chat/LiveWebSourceCards.tsx"),
      "utf8"
    );
    expect(src).toContain("Read more");
    expect(src).toContain("aria-expanded={open}");
    expect(src).toMatch(/\{open \? \([\s\S]*sources\.map/);
  });

  it("collapses research handoffs behind a More tools control", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/chat/MessageBubble.tsx"),
      "utf8"
    );
    expect(src).toContain("More tools");
    expect(src).toContain("Save to GigaLearn");
    expect(src).toContain("Open in GigaEdits");
  });
});
