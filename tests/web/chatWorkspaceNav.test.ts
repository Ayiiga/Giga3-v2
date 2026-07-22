import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("chat workspace navigation", () => {
  it("lists GigaSocial first and featured in the sidebar workspace nav", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatSidebar.tsx"),
      "utf8"
    );
    const navBlock = src.match(/const PRIMARY_NAV[\s\S]*?^= \[[\s\S]*?\];/)?.[0] ?? src;
    const gigaIdx = navBlock.indexOf('label: "GigaSocial"');
    const homeIdx = navBlock.indexOf('label: "Home"');
    const learnIdx = navBlock.indexOf('label: "GigaLearn"');
    expect(gigaIdx).toBeGreaterThan(-1);
    expect(gigaIdx).toBeLessThan(homeIdx);
    expect(gigaIdx).toBeLessThan(learnIdx);
    expect(navBlock).toContain("featured: true");
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
    expect(src).toContain("siteConfig.links.about");
    expect(src).not.toMatch(/Browse saved prompts[\s\S]{0,120}href=\"\/chat\"/);
  });
});
