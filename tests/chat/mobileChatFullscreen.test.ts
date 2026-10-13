import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("mobile chat fullscreen layout", () => {
  it("uses compact nav clearance (tab height + small gap), not a large blank band", () => {
    const css = read("web/styles/primary-nav.css");
    expect(css).toContain("var(--primary-nav-height)");
    expect(css).toContain("0.5rem");
    expect(css).not.toContain("5.15rem");
  });

  it("does not double-count safe-area under the composer while the tab bar is visible", () => {
    const css = read("web/styles/chat-mobile-app.css");
    expect(css).toMatch(
      /html\.chat-route\s+\.chat-composer-dock\s*\{[\s\S]*?padding-bottom:\s*8px/
    );
    expect(css).toContain("html.chat-route.chat-keyboard-open .chat-composer-dock");
    expect(css).toMatch(
      /chat-keyboard-open\s+\.chat-composer-dock\s*\{[\s\S]*?safe-area-inset-bottom/
    );
  });

  it("opens the keyboard layout from measured inset, not focus alone", () => {
    const shell = read("web/components/chat/ChatKeyboardShell.tsx");
    expect(shell).toContain("measuredInset >= 80");
    expect(shell).toContain("isKeyboardLikelyOpen");
    expect(shell).not.toMatch(
      /keyboardOpen\s*=\s*[\s\S]*composerFocused/
    );
  });

  it("keeps chat-stable and message-list scroll ownership", () => {
    const shell = read("web/components/chat/ChatKeyboardShell.tsx");
    expect(shell).toContain("chat-stable");
    const pane = read("web/components/chat/ChatConversationPane.tsx");
    expect(pane).toContain("chat-conversation-grid");
    expect(pane).toContain("chat-composer-dock");
    const list = read("web/components/chat/MessageList.tsx");
    expect(list).toContain("chat-message-scroll-region");
  });

  it("compacts the reserved typing bar on phones without removing it", () => {
    const css = read("web/styles/chat-mobile-app.css");
    expect(css).toMatch(
      /html\.chat-route\s+\.chat-typing-bar\s*\{[\s\S]*?min-height:\s*2\.5rem/
    );
    const bar = read("web/components/chat/ChatTypingBar.tsx");
    expect(bar).toContain("invisible");
    expect(bar).toContain("always reserved");
  });

  it("uses readable chat response font sizes on mobile (not text-sm)", () => {
    const globals = read("web/styles/globals.css");
    expect(globals).toMatch(/\.chat-markdown\s*\{[\s\S]*?font-size:\s*1\.0625rem/);
    const premium = read("web/styles/chat-premium.css");
    expect(premium).toMatch(/\.smart-answer\s*\{[\s\S]*?font-size:\s*1\.0625rem/);
    expect(premium).toMatch(
      /\.answer-content-block__body\s*\{[\s\S]*?font-size:\s*1\.0625rem/
    );
    const bubble = read("web/components/chat/MessageBubble.tsx");
    expect(bubble).toContain('text-[1.0625rem]');
    expect(bubble).not.toMatch(
      /chat-assistant-body[^"]*text-sm/
    );
  });
});

describe("chat credit idempotency retain", () => {
  it("marks jobs done instead of hard-deleting so clientRequestId can reconcile", () => {
    const jobs = read("convex/chatReplyJobs.ts");
    expect(jobs).toContain('status: "done"');
    expect(jobs).toContain("clientRequestId");
    expect(jobs).toMatch(/deleteJob[\s\S]*patch\(args\.jobId,\s*\{\s*status:\s*"done"/);
  });

  it("retains done jobs before recovery cleanup", () => {
    const policy = read("convex/chatReplyRecoveryPolicy.ts");
    expect(policy).toContain("doneRetainMs");
    expect(policy).toContain('job.status === "done"');
    expect(policy).toContain('return "wait"');
  });
});
