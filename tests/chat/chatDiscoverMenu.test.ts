import { describe, expect, it } from "vitest";
import {
  CHAT_DISCOVER_SECTIONS,
  CHAT_PLUS_SECTIONS,
  filterDiscoverTools,
  isChatPlusAction,
  listDiscoverTools,
  resolveChatCreateRoute,
} from "@/lib/chat/chatCreateMenu";

describe("chat plus (+) menu", () => {
  it("exposes Camera, Photos, Media, Connectors, Executive Assistant, and Web Search", () => {
    const labels = CHAT_PLUS_SECTIONS.flatMap((s) => s.items.map((i) => i.label));
    expect(labels).toEqual([
      "Camera",
      "Photos",
      "Media",
      "Connectors",
      "Executive Assistant",
      "Web Search",
    ]);
  });

  it("groups plus items into Media, Integrations, and Web", () => {
    expect(CHAT_PLUS_SECTIONS.map((s) => s.id)).toEqual(["media", "integrations", "web"]);
  });

  it("routes Connectors, Executive Assistant, and Web Search to their handlers", () => {
    expect(resolveChatCreateRoute("connectors")).toEqual({
      kind: "navigate",
      href: "/automation/?tab=integrations",
    });
    expect(resolveChatCreateRoute("executive-assistant")).toEqual({
      kind: "navigate",
      href: "/automation/?tab=assistant",
    });
    expect(resolveChatCreateRoute("web-search")).toEqual({ kind: "web-search" });
  });
});

describe("chat Discover panel inventory", () => {
  it("keeps plus-only actions out of Discover", () => {
    const discoverIds = listDiscoverTools().map((t) => t.id);
    for (const id of [
      "media-camera",
      "media-photos",
      "media-unified",
      "connectors",
      "executive-assistant",
      "web-search",
    ] as const) {
      expect(isChatPlusAction(id)).toBe(true);
      expect(discoverIds).not.toContain(id);
    }
  });

  it("includes writing, education, coding, research, and creative tools", () => {
    const labels = listDiscoverTools().map((t) => t.label);
    for (const label of [
      "AI Document Studio",
      "Assignment",
      "Homework",
      "Lesson Plan",
      "Study Notes",
      "Lesson Notes",
      "Essay",
      "Thesis",
      "CV / Resume",
      "Books",
      "PDF",
      "Markdown",
      "Notes",
      "AI Coding Assistant",
      "Coding Project",
      "Programming File",
      "Quiz",
      "Action Research",
      "Read a Link",
      "AI Image",
      "AI Video",
    ]) {
      expect(labels).toContain(label);
    }
  });

  it("uses relevant Discover categories", () => {
    expect(CHAT_DISCOVER_SECTIONS.map((s) => s.id)).toEqual([
      "writing",
      "education",
      "coding",
      "research",
      "creative",
    ]);
  });

  it("filters tools by search query", () => {
    const essay = filterDiscoverTools("essay");
    expect(essay).toHaveLength(1);
    expect(essay[0].items.map((i) => i.id)).toContain("doc-essay");

    const coding = filterDiscoverTools("coding");
    expect(coding.some((s) => s.id === "coding")).toBe(true);
    expect(filterDiscoverTools("zzzz-no-match")).toEqual([]);
  });

  it("preserves document template and navigation routes", () => {
    expect(resolveChatCreateRoute("doc-essay")).toEqual({
      kind: "template",
      documentId: "essay",
    });
    expect(resolveChatCreateRoute("ai-document").kind).toBe("navigate");
    expect(resolveChatCreateRoute("ai-coding").kind).toBe("navigate");
    expect(resolveChatCreateRoute("ai-video").kind).toBe("navigate");
    expect(resolveChatCreateRoute("web-link").kind).toBe("insert");
  });
});
