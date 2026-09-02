import { describe, expect, it, vi } from "vitest";
import {
  buildLiveWebMetadata,
  mergeLiveWebSources,
} from "../../convex/liveWeb/webResearchOrchestrator";
import {
  parseLiveWebMetadata,
  responseBasisLabel,
} from "../../web/lib/chat/liveWebTypes";
import {
  liveWebUnavailableMessage,
  readLiveWebEnabled,
  writeLiveWebEnabled,
} from "../../web/lib/chat/liveWebPreferences";
import { liveWebProgressLabel } from "../../web/lib/chat/liveWebLoading";
import {
  executeConfirmedWebAction,
  proposeWebAction,
} from "../../convex/liveWeb/webActionProvider";

describe("source attribution metadata", () => {
  it("builds live web metadata with sources", () => {
    const json = buildLiveWebMetadata({
      usedLiveWeb: true,
      providerId: "serper",
      sources: [
        {
          title: "Example",
          uri: "https://example.com",
          domain: "example.com",
          accessedAt: 1_700_000_000_000,
          excerpt: "Snippet",
        },
      ],
    });
    const parsed = parseLiveWebMetadata(json);
    expect(parsed?.basis).toBe("live_web");
    expect(parsed?.sources).toHaveLength(1);
    expect(responseBasisLabel(parsed)).toBe("Based on live web information.");
  });

  it("merges orchestrator and grounding sources without duplicates", () => {
    const merged = mergeLiveWebSources(
      [{ title: "A", uri: "https://a.test", domain: "a.test", accessedAt: 1 }],
      [{ title: "B", uri: "https://b.test" }]
    );
    expect(merged).toHaveLength(2);
    const again = mergeLiveWebSources(merged, [{ title: "A2", uri: "https://a.test" }]);
    expect(again).toHaveLength(2);
  });
});

describe("offline behavior", () => {
  it("returns offline message when live web requested without network", () => {
    expect(liveWebUnavailableMessage(false)).toMatch(/offline/i);
    expect(liveWebUnavailableMessage(true)).toBeNull();
  });
});

describe("live web progress labels", () => {
  it("maps server progress stages to user-visible labels", () => {
    expect(liveWebProgressLabel("searching")).toBe("Searching…");
    expect(liveWebProgressLabel("comparing")).toBe("Comparing sources…");
  });
});

describe("web actions safety", () => {
  it("blocks credential and captcha-related actions", () => {
    const proposal = proposeWebAction("Enter my password on the login form");
    expect(proposal.blockedReason).toMatch(/credentials|restricted/i);
  });

  it("requires confirmation for consequential actions and does not execute automation", () => {
    const proposal = proposeWebAction("Click buy now on https://shop.example.com");
    expect(proposal.requiresConfirmation).toBe(true);
    const result = executeConfirmedWebAction(proposal, true);
    expect(result.status).toBe("unsupported");
    expect(result.message).toMatch(/No browser interaction/i);
  });

  it("rejects unauthorized execution without confirmation", () => {
    const proposal = proposeWebAction("Navigate to https://example.com");
    const result = executeConfirmedWebAction(proposal, false);
    expect(result.status).toBe("rejected");
  });
});

describe("live web preferences", () => {
  it("persists toggle state in localStorage", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => storage.set(k, v),
      },
    });
    writeLiveWebEnabled(true);
    expect(readLiveWebEnabled()).toBe(true);
    vi.unstubAllGlobals();
  });
});
