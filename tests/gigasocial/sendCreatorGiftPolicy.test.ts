import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** Guard: tips stay open; 500 fans unlocks earn tools only. */
describe("sendCreatorGift policy", () => {
  it("does not block tips behind Gifts Hub unlock", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialEconomy.ts"),
      "utf8"
    );
    const handlerStart = src.indexOf("export const sendCreatorGift");
    expect(handlerStart).toBeGreaterThan(-1);
    const nextExport = src.indexOf("export const ", handlerStart + 10);
    const handler = src.slice(handlerStart, nextExport === -1 ? undefined : nextExport);
    expect(handler).not.toContain("has not unlocked the Gifts Hub");
    expect(handler).not.toContain("isMonetizationUnlocked");
    expect(handler).toContain("not tips or ad boosts");
  });

  it("does not block live gifts behind fan unlock", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialLive.ts"),
      "utf8"
    );
    const handlerStart = src.indexOf("export const sendLiveGift");
    expect(handlerStart).toBeGreaterThan(-1);
    const nextExport = src.indexOf("export const ", handlerStart + 10);
    const handler = src.slice(handlerStart, nextExport === -1 ? undefined : nextExport);
    expect(handler).not.toContain("unlocked live gifts");
    expect(handler).not.toContain("isMonetizationUnlocked");
  });

  it("keeps affiliate gated at 500 fans but leaves boosts open", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialEconomy.ts"),
      "utf8"
    );
    expect(src).toContain("Affiliate program unlocks at 500 Fans.");
    expect(src).not.toContain("Boost campaigns unlock at 500 Fans.");
    const boostStart = src.indexOf("export const createBoostCampaign");
    expect(boostStart).toBeGreaterThan(-1);
    const nextExport = src.indexOf("export const ", boostStart + 10);
    const boostHandler = src.slice(boostStart, nextExport === -1 ? undefined : nextExport);
    expect(boostHandler).not.toContain("isMonetizationUnlocked");
  });

  it("defaults post tip buttons on (not gated by monetizationUnlocked)", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialPostCard.tsx"),
      "utf8"
    );
    expect(src).toMatch(/enablePostTips\s*=\s*true/);
    expect(src).not.toMatch(/monetizationUnlocked/);
  });

  it("shows public profile gifts without monetization unlock", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialPublicProfileClient.tsx"),
      "utf8"
    );
    expect(src).toContain('["gifts", "Gifts"]');
    expect(src).not.toMatch(/monetizationUnlocked \? \[\[\"gifts\"/);
    expect(src).toContain("enablePostTips");
  });
});
