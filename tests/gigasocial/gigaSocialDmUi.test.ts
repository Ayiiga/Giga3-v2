import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  dmUiStrings,
  readDmUiLocale,
  type DmUiLocale,
} from "../../web/lib/gigasocial/dmLocale";
import {
  interpretDmHistoryPage,
  newDmClientId,
} from "../../web/lib/gigasocial/dmPagination";
import { GIGASOCIAL_FEATURE_DEFAULTS } from "../../web/lib/gigasocial/featureFlags";
import { GIGASOCIAL_SECTIONS } from "../../web/lib/gigasocial/sections";

const root = resolve(__dirname, "../..");
const panelSrc = readFileSync(
  resolve(root, "web/components/gigasocial/dm/GigaSocialMessagesPanel.tsx"),
  "utf8"
);
const clientSrc = readFileSync(
  resolve(root, "web/components/gigasocial/GigaSocialClient.tsx"),
  "utf8"
);
const navSrc = readFileSync(
  resolve(root, "web/components/gigasocial/ux/GigaSocialContextNav.tsx"),
  "utf8"
);
const notificationsSrc = readFileSync(
  resolve(root, "web/components/gigasocial/GigaSocialNotificationsPanel.tsx"),
  "utf8"
);
const localeSrc = readFileSync(
  resolve(root, "web/lib/gigasocial/dmLocale.ts"),
  "utf8"
);
const dmApiSrc = readFileSync(resolve(root, "convex/gigaSocialDm.ts"), "utf8");

describe("GigaSocial DM UI — feature disabled by default", () => {
  it("defaults enableDirectMessages to false", () => {
    expect(GIGASOCIAL_FEATURE_DEFAULTS.enableDirectMessages).toBe(false);
  });

  it("hides Messages chrome unless showMessages / enableDirectMessages", () => {
    expect(clientSrc).toContain("enableDirectMessages");
    expect(clientSrc).toContain('item.id === "messages"');
    expect(navSrc).toContain("showMessages");
    expect(panelSrc).toContain("featureDisabledTitle");
    expect(panelSrc).toContain("serverDisabledTitle");
  });

  it("does not replace notifications Inbox APIs", () => {
    expect(notificationsSrc).toContain("api.gigaSocial.listNotifications");
    expect(notificationsSrc).toContain("markNotificationsRead");
    expect(clientSrc).toContain("GigaSocialNotificationsPanel");
    expect(clientSrc).toContain('section === "notifications"');
    expect(navSrc).toContain('"Inbox"');
    expect(navSrc).toContain('item.id === "notifications"');
  });
});

describe("GigaSocial DM UI — sections and wiring", () => {
  it("registers a distinct messages section", () => {
    expect(GIGASOCIAL_SECTIONS.some((s) => s.id === "messages")).toBe(true);
    expect(GIGASOCIAL_SECTIONS.some((s) => s.id === "notifications")).toBe(true);
  });

  it("wires Phase 2C/2E DM handlers including soft decline", () => {
    for (const name of [
      "listMyThreads",
      "listThreadMessages",
      "sendMessage",
      "acceptRequest",
      "declineRequest",
      "blockUser",
      "reportMessage",
      "getDmFoundationStatus",
    ]) {
      expect(dmApiSrc).toContain(`export const ${name}`);
      expect(panelSrc).toContain(`api.gigaSocialDm.${name}`);
    }
    expect(panelSrc).toContain("declineAndBlock");
    expect(panelSrc).toContain("blockUser");
    expect(panelSrc).toContain("loadMoreThreads");
    expect(panelSrc).toContain("initialRecipient");
    expect(clientSrc).toContain('params.get("to")');
    expect(clientSrc).toContain('params.get("thread")');
  });

  it("uses sessionToken for mutations and never client identity as auth", () => {
    expect(panelSrc).toMatch(/sendMessage\(\{[\s\S]*sessionToken/);
    expect(panelSrc).toMatch(/acceptRequest\(\{[\s\S]*sessionToken/);
    expect(panelSrc).toMatch(/declineRequest\(\{[\s\S]*sessionToken/);
    expect(panelSrc).toMatch(/blockUser\(\{[\s\S]*sessionToken/);
    expect(panelSrc).toMatch(/reportMessage\(\{[\s\S]*sessionToken/);
  });
});

describe("GigaSocial DM UI — pagination M2 safety", () => {
  it("does not treat empty cursor page as end of history", () => {
    const emptyWithCursor = interpretDmHistoryPage(
      { messages: [], nextCursor: null },
      { usedCursor: true }
    );
    expect(emptyWithCursor).toEqual({ kind: "empty_not_exhausted", retry: true });
    expect(panelSrc).toContain("loadOlderHint");
    expect(panelSrc).toContain("empty_not_exhausted");
  });

  it("marks exhausted only after non-empty page with null cursor or empty first page", () => {
    expect(
      interpretDmHistoryPage(
        {
          messages: [{ messageId: "a", createdAt: 1 }],
          nextCursor: null,
        },
        { usedCursor: false }
      )
    ).toMatchObject({ exhausted: true });
    expect(
      interpretDmHistoryPage({ messages: [], nextCursor: null }, { usedCursor: false })
    ).toEqual({ kind: "exhausted" });
  });
});

describe("GigaSocial DM UI — block M1 honesty + duplicate send", () => {
  it("documents local hide and history note after block", () => {
    expect(panelSrc).toContain("hideDmThreadLocally");
    expect(panelSrc).toContain("blockHistoryNote");
  });

  it("prevents duplicate submission with clientId + pending guard", () => {
    expect(panelSrc).toContain("newDmClientId");
    expect(panelSrc).toContain("pendingClientId");
    expect(panelSrc).toContain("if (sending || pendingClientId.current) return");
    expect(newDmClientId().length).toBeGreaterThan(8);
  });
});

describe("GigaSocial DM UI — localization", () => {
  it("provides English and French catalogs with required keys", () => {
    const keys = [
      "sectionTitle",
      "acceptRequest",
      "declineAndBlock",
      "blockUser",
      "reportMessage",
      "offlineSend",
      "featureDisabledTitle",
      "loadOlderHint",
    ] as const;
    for (const locale of ["en", "fr"] as DmUiLocale[]) {
      const s = dmUiStrings(locale);
      for (const key of keys) {
        expect(s[key].trim().length).toBeGreaterThan(0);
      }
    }
    expect(localeSrc).toContain("localeToggleFr");
    expect(readDmUiLocale()).toMatch(/^(en|fr)$/);
  });
});

describe("GigaSocial DM UI — a11y hooks", () => {
  it("includes labels, roles, and touch-friendly min heights", () => {
    expect(panelSrc).toContain("aria-label");
    expect(panelSrc).toContain('role="log"');
    expect(panelSrc).toContain("min-h-11");
    expect(panelSrc).toContain("min-h-12");
    expect(panelSrc).toContain("sr-only");
  });
});
