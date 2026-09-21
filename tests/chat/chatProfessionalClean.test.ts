import { describe, expect, it } from "vitest";
import {
  AFRICAN_READER_VOICES,
} from "@/components/chat/AfricanVoiceReader";
import { CHAT_CREATE_SECTIONS } from "@/lib/chat/chatCreateMenu";
import { getSuggestedPrompts } from "@/lib/chat/suggestedPrompts";
import {
  WORKSPACE_FILTER_TABS,
  itemMatchesWorkspaceTab,
  templateShortcutsForTab,
  workspaceRuntimeBadge,
} from "@/lib/chat/workspaceTabs";

describe("workspace filter tabs", () => {
  it("exposes the nine required tabs starting with All", () => {
    expect(WORKSPACE_FILTER_TABS.map((t) => t.id)).toEqual([
      "All", "Chat", "Learn", "Create", "Social", "Research", "Books", "Code", "CV",
    ]);
  });

  it("matches drawer apps to their tabs", () => {
    expect(itemMatchesWorkspaceTab("gigalearn", "Learn")).toBe(true);
    expect(itemMatchesWorkspaceTab("gigaedit", "Create")).toBe(true);
    expect(itemMatchesWorkspaceTab("gigasocial", "Social")).toBe(true);
    expect(itemMatchesWorkspaceTab("News desk", "Research")).toBe(true);
    expect(itemMatchesWorkspaceTab("gigalearn", "Research")).toBe(false);
    expect(itemMatchesWorkspaceTab("Home", "All")).toBe(true);
  });

  it("badges on-device vs AI Studio runtimes", () => {
    expect(workspaceRuntimeBadge("gigaedit")).toBe("ON DEVICE");
    expect(workspaceRuntimeBadge("gigalearn")).toBe("AI STUDIO");
    expect(workspaceRuntimeBadge("media-studio")).toBe("AI STUDIO");
    expect(workspaceRuntimeBadge("gigasocial")).toBeNull();
  });

  it("serves template shortcuts per tab (Research includes Book/Research/Essay/CV)", () => {
    const research = templateShortcutsForTab("Research").map((s) => s.title);
    expect(research).toContain("Research Paper");
    expect(research).toContain("Essay");
    expect(templateShortcutsForTab("Books").map((s) => s.title)).toContain("Book Template");
    expect(templateShortcutsForTab("Code").map((s) => s.title)).toContain("Code");
    expect(templateShortcutsForTab("CV").map((s) => s.title)).toContain("CV");
    expect(templateShortcutsForTab("All").length).toBeGreaterThanOrEqual(6);
  });
});

describe("upload grid runtime badges", () => {
  it("marks media items ON DEVICE and document items AI STUDIO", () => {
    const media = CHAT_CREATE_SECTIONS.find((s) => s.id === "media")!;
    expect(media.items.length).toBeGreaterThan(0);
    for (const item of media.items) {
      expect(item.runtime).toBe("ON DEVICE");
    }
    const docs = CHAT_CREATE_SECTIONS.find((s) => s.id === "documents")!;
    const research = docs.items.find((i) => i.id === "doc-research")!;
    expect(research.label).toBe("Action Research");
    expect(research.runtime).toBe("AI STUDIO");
  });
});

describe("global suggested prompts", () => {
  it("appends book/research/CV/code/news prompts to general mode", () => {
    const six = getSuggestedPrompts("general", 6).map((p) => p.label);
    expect(six).toContain("Open GigaSocial");
    expect(six).toContain("Book outline");
    const extended = getSuggestedPrompts("general", 10).map((p) => p.label);
    expect(extended).toContain("Research essay");
    expect(extended).toContain("Write CV");
    expect(extended).toContain("Code help");
    expect(extended).toContain("Ghana news");
  });
});

describe("African reader voices", () => {
  it("defaults to English (British) first with male and female African voices", () => {
    expect(AFRICAN_READER_VOICES.length).toBeGreaterThanOrEqual(11);
    expect(AFRICAN_READER_VOICES[0].id).toBe("english-british");
    expect(AFRICAN_READER_VOICES.some((v) => v.name.includes("(M)"))).toBe(true);
    expect(AFRICAN_READER_VOICES.some((v) => v.name.includes("(F)"))).toBe(true);
  });
});
