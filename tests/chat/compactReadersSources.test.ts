import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("compact Readers and Sources UI", () => {
  it("keeps voice language selection out of the chat bubble (Settings only)", () => {
    const bubble = readFileSync(
      resolve(__dirname, "../../web/components/chat/MessageBubble.tsx"),
      "utf8"
    );
    const settings = readFileSync(
      resolve(__dirname, "../../web/components/settings/LanguagePreferencesSettings.tsx"),
      "utf8"
    );
    expect(bubble).not.toContain("Change voice");
    expect(bubble).not.toContain("AfricanVoiceReader");
    expect(settings).toContain("Read-aloud voice");
    expect(settings).toContain("GIGA_CHAT_VOICES.map");
  });

  it("does not mount Document Studio for structured answer blocks (avoids duplicate reply)", () => {
    const bubble = readFileSync(
      resolve(__dirname, "../../web/components/chat/MessageBubble.tsx"),
      "utf8"
    );
    expect(bubble).toContain("!answerBlocks?.isStructured");
    expect(bubble).toContain("!smartAnswer");
    expect(bubble).toContain("DocumentResultCard");
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
