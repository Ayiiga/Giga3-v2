import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Chat mobile app UI shell", () => {
  it("ships compact purple header, violet G logo, and mobile bubble styles", () => {
    const chrome = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatChrome.tsx"),
      "utf8"
    );
    const logo = readFileSync(
      resolve(__dirname, "../../web/components/brand/Giga3Logo.tsx"),
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
    const shell = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatKeyboardShell.tsx"),
      "utf8"
    );

    expect(chrome).toContain("chat-header-bar--app");
    expect(chrome).toContain("Giga3Logo");
    expect(chrome).toContain("chat-header-title-mobile");
    expect(chrome).not.toContain("ChatVoiceLanguageBar");
    expect(logo).toContain("#6D28D9");
    expect(logo).toContain("#7C3AED");
    expect(css).toContain("#7c3aed");
    expect(css).toContain("--chat-header-height");
    expect(shell).toContain("chat-app-shell");
    expect(css).toContain("chat-app-shell");
    expect(css).toContain("100dvh");
    expect(css).toContain("width: 96%");
    expect(css).toContain("max-width: 78%");
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
    const voices = readFileSync(
      resolve(__dirname, "../../web/lib/chat/gigaVoice.ts"),
      "utf8"
    );
    expect(pref).toContain("giga3_voice_language_id");
    expect(reader).toContain("subscribeVoiceLanguageId");
    expect(voices).toContain("(M)");
    expect(voices).toContain("(F)");
  });
});
