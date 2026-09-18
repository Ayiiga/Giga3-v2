import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Chat mobile app UI shell", () => {
  it("ships purple header, voice language pill, and mobile bubble styles", () => {
    const chrome = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatChrome.tsx"),
      "utf8"
    );
    const voiceBar = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatVoiceLanguageBar.tsx"),
      "utf8"
    );
    const css = readFileSync(
      resolve(__dirname, "../../web/styles/chat-mobile-app.css"),
      "utf8"
    );
    const input = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatInput.tsx"),
      "utf8"
    );

    expect(chrome).toContain("chat-header-bar--app");
    expect(chrome).toContain("ChatVoiceLanguageBar");
    expect(chrome).toContain("chat-header-title-mobile");
    expect(voiceBar).toContain("Voice Language:");
    expect(voiceBar).toContain("AFRICAN_READER_VOICES");
    expect(css).toContain(".chat-voice-language-pill");
    expect(css).toContain("#7c3aed");
    expect(input).toContain("Message Giga3...");
  });

  it("persists voice language preference for African reader", () => {
    const pref = readFileSync(
      resolve(__dirname, "../../web/lib/chat/voiceLanguagePreference.ts"),
      "utf8"
    );
    const reader = readFileSync(
      resolve(__dirname, "../../web/components/chat/AfricanVoiceReader.tsx"),
      "utf8"
    );
    expect(pref).toContain("giga3_voice_language_id");
    expect(reader).toContain("subscribeVoiceLanguageId");
  });
});
