import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("credit and payment manipulation guards", () => {
  it("Paystack fulfilment fails closed when charged amount is missing", () => {
    const paystack = read("convex/paystack.ts");
    const validateStart = paystack.indexOf("function validatePaymentAmount");
    expect(validateStart).toBeGreaterThan(-1);
    const body = paystack.slice(validateStart, validateStart + 900);
    expect(body).toContain("pesewas === null");
    expect(body).toContain("cannot fulfil safely");
    expect(body).not.toContain("Could not parse amount from Paystack response for reconciliation");
    expect(body).not.toMatch(/if \(pesewas === null\) \{\s*console\.warn/);
  });

  it("public deductCredits does not accept a client amount override", () => {
    const credits = read("convex/credits.ts");
    const start = credits.indexOf("export const deductCredits = mutation");
    expect(start).toBeGreaterThan(-1);
    const next = credits.indexOf("\nexport ", start + 1);
    const block = credits.slice(start, next === -1 ? undefined : next);
    expect(block).not.toMatch(/amount:\s*v\.optional/);
    expect(block).toContain("requireSession(args.sessionToken, ctx)");
    expect(credits).toContain("Credit undercharge blocked");
    expect(read("convex/mediaCredits.ts")).toContain(
      "internal.credits.deductCreditsInternal"
    );
    expect(read("convex/mediaCredits.ts")).not.toContain("api.credits.deductCredits");
  });

  it("deductTokens rejects non-positive amounts (no negative minting)", () => {
    const users = read("convex/users.ts");
    const start = users.indexOf("export const deductTokens = mutation");
    expect(start).toBeGreaterThan(-1);
    const next = users.indexOf("\nexport ", start + 1);
    const block = users.slice(start, next === -1 ? undefined : next);
    expect(block).toContain("args.amount <= 0");
    expect(block).toContain("Invalid token amount");
    expect(block).toContain("Insufficient tokens");
    expect(block).not.toMatch(/Math\.max\(0,\s*\(user\.tokens/);
  });

  it("gift and live gift money paths enforce session revocation via ctx", () => {
    for (const file of ["convex/gigaSocialEconomy.ts", "convex/gigaSocialLive.ts"]) {
      expect(read(file), file).not.toMatch(/requireSession\(args\.sessionToken\)/);
    }
    const gift = read("convex/gigaSocialEconomy.ts");
    expect(gift).toMatch(
      /sendCreatorGift[\s\S]*requireSession\(args\.sessionToken, ctx\)/
    );
    const live = read("convex/gigaSocialLive.ts");
    expect(live).toMatch(
      /sendLiveGift[\s\S]*requireSession\(args\.sessionToken, ctx\)/
    );
  });
});
