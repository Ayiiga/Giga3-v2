import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "../../web/node_modules/react";
import { renderToStaticMarkup } from "../../web/node_modules/react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageList } from "../../web/components/chat/MessageList";

const messageList = readFileSync(
  resolve(__dirname, "../../web/components/chat/MessageList.tsx"),
  "utf8"
);
const workspace = readFileSync(
  resolve(__dirname, "../../web/components/chat/ChatWorkspacePanel.tsx"),
  "utf8"
);
const navCss = readFileSync(
  resolve(__dirname, "../../web/styles/primary-nav.css"),
  "utf8"
);

describe("empty chat stays quiet and the composer clears the bottom nav", () => {
  it("shows quick actions, examples and leaves templates in Workspace", () => {
    expect(messageList).toContain("What would you like to do?");
    expect(messageList).toContain("HOME_QUICK_ACTIONS");
    expect(messageList).toContain("getSuggestedPrompts(mode, 3)");
    expect(messageList).not.toContain("Document templates");
    expect(messageList).not.toContain("DOCUMENT_TEMPLATES");
    expect(messageList).not.toContain("WRITING_QUICK_START");
    expect(workspace).toContain("CHAT_WORKSPACE_PRIMARY_APPS");
    expect(workspace).toContain("useState(false)");
    expect(workspace).toContain("defaultOpen={false}");
    expect(workspace).not.toContain("setTab(\"documents\")");
  });

  it("lifts the chat shell just above the real tab bar on phones only", () => {
    const phone = navCss.match(
      /@media \(max-width: 1023px\) \{[\s\S]*?html\.chat-route\.primary-nav-route\.primary-nav-bar-visible \{[\s\S]*?\}/
    )?.[0];
    expect(phone).toContain(
      "--primary-nav-offset: calc(5.15rem + env(safe-area-inset-bottom, 0px))"
    );
    const desktop = navCss.match(/@media \(min-width: 1024px\) \{[\s\S]*?\n\}/g) ?? [];
    expect(desktop.join("\n")).not.toContain("5.15rem");
  });

  it("renders the empty chat with quick actions, continue and examples", () => {
    const html = renderToStaticMarkup(
      createElement(MessageList, {
        messages: [],
        mode: "general",
        onInsertTemplate: () => undefined,
        onQuickAction: () => undefined,
        recentConversations: [
          { id: "c1", title: "JHS 2 Career Technology", mode: "gigalearn" },
        ],
        onSelectConversation: () => undefined,
      })
    );
    expect(html).toContain("Welcome to Giga3");
    expect(html).toContain("What would you like to do?");
    expect(html).toContain("Learn");
    expect(html).toContain("Research");
    expect(html).toContain("Create");
    expect(html).toContain("Code");
    expect(html).toContain("Continue");
    expect(html).toContain("JHS 2 Career Technology");
    expect(html).toContain("Try an example");
    expect(html).toContain("Open GigaSocial");
    expect(html).toContain("Summarize");
    expect(html).toContain("Compare");
    expect(html).not.toContain("Document templates");
    expect(html).not.toContain("Start writing");
    expect(html).not.toContain("Book Template");
    const buttons = html.match(/<button/g) ?? [];
    // 4 quick actions + 1 continue row + 3 example prompts
    expect(buttons.length).toBe(8);
  });

  it("hides the continue section when there is no history", () => {
    const html = renderToStaticMarkup(
      createElement(MessageList, {
        messages: [],
        mode: "general",
        onInsertTemplate: () => undefined,
        onQuickAction: () => undefined,
      })
    );
    expect(html).not.toContain("Continue where you left off");
  });
});
