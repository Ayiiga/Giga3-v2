import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CHAT_WORKSPACE_PRIMARY_APPS } from "../../web/lib/chat/workspaceApps";

describe("chat workspace navigation", () => {
  it("lists primary apps in education-first order", () => {
    expect(CHAT_WORKSPACE_PRIMARY_APPS.map((app) => app.label)).toEqual([
      "GigaLearn Academy",
      "Exam Practice",
      "Technology Hub",
      "GigaSocial",
      "Giga3 Blog",
    ]);
  });

  it("does not advertise Media Studio or GigaEdits as workspace apps", () => {
    const labels = CHAT_WORKSPACE_PRIMARY_APPS.map((app) => app.label);
    expect(labels).not.toContain("Media Studio");
    expect(labels).not.toContain("GigaEdits");
    expect(labels).not.toContain("GigaEdit");
  });

  it("builds sidebar workspace nav from the shared primary app list", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatSidebar.tsx"),
      "utf8"
    );
    expect(src).toContain("CHAT_WORKSPACE_PRIMARY_APPS");
    expect(src).toContain('label: "Giga3 Blog"');
    const homeIdx = src.indexOf('label: "Home"');
    const primarySpreadIdx = src.indexOf("...CHAT_WORKSPACE_PRIMARY_APPS.map");
    expect(primarySpreadIdx).toBeGreaterThan(-1);
    expect(primarySpreadIdx).toBeLessThan(homeIdx);
  });

  it("avoids smooth scroll when opening workspace panels", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/lib/chat/workspaceNav.ts"),
      "utf8"
    );
    expect(src).toContain('behavior: "auto"');
    expect(src).not.toContain('behavior: "smooth"');
  });

  it("wires browse prompts and help to real destinations", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatSidebar.tsx"),
      "utf8"
    );
    expect(src).toContain("siteConfig.links.prompts");
    expect(src).toContain('href="/settings/"');
    expect(src).not.toMatch(/Browse saved prompts[\s\S]{0,120}href=\"\/chat\"/);
  });

  it("keeps Account destinations in Settings instead of the chat sidebar", () => {
    const sidebar = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatSidebar.tsx"),
      "utf8"
    );
    const settings = readFileSync(
      resolve(__dirname, "../../web/components/account/AccountSettingsClient.tsx"),
      "utf8"
    );
    const accountNav = readFileSync(
      resolve(__dirname, "../../web/lib/account/accountNav.ts"),
      "utf8"
    );
    expect(sidebar).not.toContain('label: "GigaWallet"');
    expect(sidebar).not.toContain('title="Account"');
    expect(sidebar).not.toContain("<SidebarSection title=\"Account\">");
    expect(settings).toContain("ACCOUNT_SETTINGS_NAV");
    expect(accountNav).toContain('label: "GigaWallet"');
    expect(accountNav).toContain('label: "Help Center"');
  });
});
