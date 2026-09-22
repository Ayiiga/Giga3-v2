import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Chat mobile full-width layout", () => {
  const css = readFileSync(
    resolve(__dirname, "../../web/styles/chat-mobile-app.css"),
    "utf8"
  );
  const overflow = readFileSync(
    resolve(__dirname, "../../web/styles/chat-overflow.css"),
    "utf8"
  );
  const input = readFileSync(
    resolve(__dirname, "../../web/components/chat/ChatInput.tsx"),
    "utf8"
  );
  const pane = readFileSync(
    resolve(__dirname, "../../web/components/chat/ChatConversationPane.tsx"),
    "utf8"
  );

  it("uses full-width composer and footer on mobile without 96% gutters", () => {
    expect(css).not.toContain("width: 96%");
    expect(css).toContain("html.chat-route .chat-composer");
    expect(css).toMatch(/html\.chat-route \.chat-composer[\s\S]*width: 100%/);
    expect(css).toMatch(/html\.chat-route \.chat-footer-chips[\s\S]*width: 100%/);
  });

  it("keeps readable user bubble width while assistant uses full rail", () => {
    expect(css).toContain("max-width: 78%");
    expect(css).toMatch(/chat-message-turn-assistant[\s\S]*max-width: 100%/);
    expect(css).toContain("100dvh");
    expect(css).toContain("--chat-edge-pad");
  });

  it("removes centered rail constraint from mobile chat threads", () => {
    expect(overflow).toContain("@media (max-width: 1023px)");
    expect(overflow).toContain("html.chat-route .chat-thread");
    expect(overflow).toContain("margin-inline: 0");
  });

  it("avoids stacked horizontal padding on mobile composer", () => {
    expect(input).toContain('className="chat-composer min-w-0 max-w-full px-0 py-1');
    expect(pane).toContain("chat-footer-chips min-w-0 max-w-full px-0");
  });
});
