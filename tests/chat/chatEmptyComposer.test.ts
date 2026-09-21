import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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

  it("lifts the chat shell just above the real tab bar", () => {
    expect(navCss).toContain(
      "html.chat-route.primary-nav-route.primary-nav-bar-visible"
    );
    expect(navCss).toContain(
      "--primary-nav-offset: calc(5.15rem + env(safe-area-inset-bottom, 0px))"
    );
  });
});
