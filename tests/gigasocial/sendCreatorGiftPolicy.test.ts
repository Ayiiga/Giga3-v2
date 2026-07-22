import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** Guard: feed Tip button must not hard-fail on monetization unlock. */
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
});
