import { describe, expect, it } from "vitest";
import type { UiMessage } from "@/components/chat/MessageList";
import {
  conversationLooksLikeManuscript,
  formatManuscriptMarkdown,
  modelTierForTemplate,
  templateInsertNotice,
  writingModeForTemplate,
} from "@/lib/chat/writingWorkflow";

describe("writingWorkflow", () => {
  it("maps long-form templates to the right AI modes", () => {
    expect(writingModeForTemplate("book-writing")).toBe("book");
    expect(writingModeForTemplate("essay")).toBe("university");
    expect(writingModeForTemplate("thesis")).toBe("university");
    expect(writingModeForTemplate("research-paper")).toBe("research");
  });

  it("suggests smart tier for research-heavy templates", () => {
    expect(modelTierForTemplate("thesis")).toBe("smart");
    expect(modelTierForTemplate("research-paper")).toBe("smart");
  });

  it("builds helpful insert notices for thesis and research", () => {
    expect(templateInsertNotice("thesis")).toContain("University mode");
    expect(templateInsertNotice("thesis")).toContain("Live Web");
    expect(templateInsertNotice("book-writing")).toContain("Book Writer");
  });

  it("formats assistant replies into a manuscript export", () => {
    const messages: UiMessage[] = [
      { id: "1", role: "user", content: "Draft chapter 1" },
      {
        id: "2",
        role: "assistant",
        content:
          "# Chapter 1\n\nOpening paragraph with enough detail to export cleanly into a manuscript file for review.",
      },
      {
        id: "3",
        role: "assistant",
        content:
          "# Chapter 2\n\nSecond chapter continues the manuscript with more prose and analysis for the reader.",
      },
    ];

    const markdown = formatManuscriptMarkdown(messages, { title: "My Book" });
    expect(markdown).toContain("# My Book");
    expect(markdown).toContain("# Chapter 1");
    expect(markdown).toContain("# Chapter 2");
    expect(markdown).not.toContain("Draft chapter 1");
    expect(conversationLooksLikeManuscript(messages)).toBe(true);
  });
});
