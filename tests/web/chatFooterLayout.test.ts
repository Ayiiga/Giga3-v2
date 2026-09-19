import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pane = readFileSync(
  resolve(__dirname, "../../web/components/chat/ChatConversationPane.tsx"),
  "utf8"
);
const input = readFileSync(
  resolve(__dirname, "../../web/components/chat/ChatInput.tsx"),
  "utf8"
);
const globalsCss = readFileSync(
  resolve(__dirname, "../../web/styles/globals.css"),
  "utf8"
);
const mobileCss = readFileSync(
  resolve(__dirname, "../../web/styles/chat-mobile-app.css"),
  "utf8"
);
const primaryNavCss = readFileSync(
  resolve(__dirname, "../../web/styles/primary-nav.css"),
  "utf8"
);

describe("chat footer layout", () => {
  it("places recommendation chips in the shared footer above the composer", () => {
    expect(pane).toContain("chat-footer");
    expect(pane).toContain("chat-footer-chips");
    expect(pane).toContain("onComposerActivityChange={handleComposerActivityChange}");
    expect(pane).toMatch(/showFooterChips[\s\S]*RecommendationChips/);
    expect(pane).not.toMatch(
      /<\/MessageListErrorBoundary>\s*\{messages\.length > 0 \? \(\s*<div className="shrink-0 border-t/
    );
  });

  it("hides footer chips while the composer is active", () => {
    expect(pane).toContain("const showFooterChips = messages.length > 0 && !composerActive");
    expect(input).toContain("onComposerActivityChange");
    expect(input).toContain("composerFocused || value.trim().length > 0");
  });

  it("gives the message scroll region flex growth instead of composer clearance hacks", () => {
    expect(globalsCss).toContain(".chat-message-scroll-region");
    expect(globalsCss).toMatch(/\.chat-message-scroll-region[\s\S]*flex-grow:\s*1/);
    expect(globalsCss).not.toContain(".chat-composer {\n  margin-bottom: 80px");
    expect(globalsCss).not.toMatch(
      /\.main-scroll-container,[\s\S]*\.chat-keyboard-shell,[\s\S]*padding-bottom: 96px/
    );
    expect(globalsCss).toContain(
      "html.primary-nav-route.primary-nav-bar-visible.chat-route .chat-keyboard-shell"
    );
  });

  it("keeps suggestion chips flush above the composer input", () => {
    expect(globalsCss).toContain(".chat-footer-chips + .chat-composer-dock .chat-composer");
    expect(globalsCss).toMatch(/padding-top:\s*0/);
    expect(mobileCss).toContain(".chat-footer-chips + .chat-composer-dock .chat-composer");
    expect(mobileCss).toMatch(/\.chat-suggested-chips__row[\s\S]*padding:\s*0/);
    expect(mobileCss).toMatch(/\.chat-suggested-chips[\s\S]*min-height:\s*0/);
  });

  it("keeps the mobile tab bar flush without extra safe-area padding", () => {
    const mobileBlock = primaryNavCss.match(/\.primary-nav--mobile \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(mobileBlock).toContain("margin-top: 0");
    expect(mobileBlock).not.toContain("safe-area-inset-bottom");
    expect(globalsCss).toMatch(/\.primary-nav--mobile[\s\S]*margin-top:\s*0/);
  });
});
