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
  it("shows a few prompts and leaves templates in Workspace", () => {
    expect(messageList).toContain("getSuggestedPrompts(mode, 3)");
    expect(messageList).toContain("Open Workspace when you want a template");
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

  it("renders the empty chat without the template wall", () => {
    const html = renderToStaticMarkup(
      createElement(MessageList, {
        messages: [],
        mode: "general",
        onInsertTemplate: () => undefined,
      })
    );
    expect(html).toContain("Welcome to Giga3 AI");
    expect(html).toContain("Open Workspace when you want a template");
    expect(html).toContain("Open GigaSocial");
    expect(html).toContain("Summarize");
    expect(html).toContain("Compare");
    expect(html).not.toContain("Document templates");
    expect(html).not.toContain("Start writing");
    expect(html).not.toContain("Book Template");
    const buttons = html.match(/<button/g) ?? [];
    expect(buttons.length).toBe(3);
  });
});
