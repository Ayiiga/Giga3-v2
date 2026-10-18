import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** Guard: tips stay open; monetisation requires acceptance; affiliate has no fan gate. */
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

  it("opens affiliate to everyone and keeps boosts on Paystack", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/gigaSocialEconomy.ts"),
      "utf8"
    );
    expect(src).not.toContain("Affiliate program unlocks at 500 Fans.");
    expect(src).toContain("No fan-count gate");
    expect(src).toContain("MIN_FANS_FOR_MONETIZATION = 5");
    expect(src).toContain("MIN_FANS_FOR_WITHDRAWAL = 20");
    expect(src).toContain("acceptMonetizationTerms");
    expect(src).not.toContain("Boost campaigns unlock at 500 Fans.");
    const boostStart = src.indexOf("export const createBoostCampaign");
    expect(boostStart).toBeGreaterThan(-1);
    const nextExport = src.indexOf("export const ", boostStart + 10);
    const boostHandler = src.slice(boostStart, nextExport === -1 ? undefined : nextExport);
    expect(boostHandler).not.toContain("isMonetizationUnlocked");
    expect(boostHandler).toContain("Paystack");
  });

  it("defaults post tip buttons on (not gated by monetizationUnlocked)", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialPostCard.tsx"),
      "utf8"
    );
    expect(src).toMatch(/enablePostTips\s*=\s*true/);
    expect(src).not.toMatch(/monetizationUnlocked/);
    expect(src).toContain("Boost post");
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

  it("removes contradictory 100/500 fan copy from creator UI", () => {
    const client = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialClient.tsx"),
      "utf8"
    );
    const affiliate = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/economy/GigaSocialAffiliatePanel.tsx"),
      "utf8"
    );
    const dashboard = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/economy/GigaSocialCreatorDashboard.tsx"),
      "utf8"
    );
    expect(client).not.toContain("500 fans");
    expect(client).not.toContain("100 fans");
    expect(affiliate).not.toContain("500 fans");
    expect(dashboard).not.toContain("500 fans");
    expect(dashboard).not.toContain("100 fans");
    expect(affiliate).toContain("Open to everyone");
  });
});
