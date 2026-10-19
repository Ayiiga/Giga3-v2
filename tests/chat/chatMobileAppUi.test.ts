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
    const keyboardShell = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatKeyboardShell.tsx"),
      "utf8"
    );
    const chatShell = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatShell.tsx"),
      "utf8"
    );

    expect(chrome).toContain("chat-header-bar--app");
    expect(chrome).toContain("Giga3Logo");
    expect(chrome).toContain("chat-header-title-mobile");
    expect(chrome).toContain("ChatMoreMenu");
    expect(chatShell).not.toContain("ChatVoiceLanguageBar");
    expect(chatShell).toContain("chat-main-column--has-messages");
    expect(keyboardShell).toContain("warmUpBrowserVoices");
    expect(logo).toContain("#6D28D9");
    expect(logo).toContain("#7C3AED");
    expect(css).toContain("#7c3aed");
    expect(css).toContain("--chat-header-height");
    expect(css).toContain(".chat-header-bar--app .chat-header-menu");
    expect(keyboardShell).toContain("chat-app-shell");
    expect(css).toContain("chat-app-shell");
    expect(css).toContain("100dvh");
    expect(css).toContain("width: 100%");
    expect(css).toContain("max-width: 78%");
    expect(css).toContain("--chat-edge-pad");
    expect(input).toContain("Ask Giga3 anything…");
  });

  it("makes the mobile more-menu (3-dots) white on the purple header", () => {
    const more = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatMoreMenu.tsx"),
      "utf8"
    );
    const css = readFileSync(
      resolve(__dirname, "../../web/styles/chat-mobile-app.css"),
      "utf8"
    );
    expect(more).toContain("chat-header-menu");
    expect(more).toContain("text-white");
    expect(more).toContain("More actions");
    expect(css).toContain("color: #fff !important");
  });

  it("persists voice language preference via Settings (not chat chrome)", () => {
    const pref = readFileSync(
      resolve(__dirname, "../../web/lib/chat/voiceLanguagePreference.ts"),
      "utf8"
    );
    const settings = readFileSync(
      resolve(__dirname, "../../web/components/settings/LanguagePreferencesSettings.tsx"),
      "utf8"
    );
    const voices = readFileSync(
      resolve(__dirname, "../../web/lib/speech/gigaVoiceProfiles.ts"),
      "utf8"
    );
    expect(pref).toContain("giga3_voice_language_id");
    expect(settings).toContain("writeVoiceLanguageId");
    expect(settings).toContain("Read-aloud voice");
    expect(voices).toContain("(M)");
    expect(voices).toContain("(F)");
  });
});
