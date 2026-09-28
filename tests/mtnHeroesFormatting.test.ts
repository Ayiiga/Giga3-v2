import { describe, expect, it } from "vitest";
import { buildMtnHeroesSystemPromptAddon } from "../convex/mtnHeroesOfChangeRules";

describe("MTN Heroes markdown formatting guidance", () => {
  it("asks for bold facts, italics, and bullets without new claims", () => {
    const addon = buildMtnHeroesSystemPromptAddon("MTN Heroes of Change Season 8 prizes");
    expect(addon).toMatch(/\*\*bold\*\*/);
    expect(addon).toMatch(/GH¢400,000/);
    expect(addon).toMatch(/GH¢200,000/);
    expect(addon).toMatch(/GH¢100,000 per remaining finalist/);
    expect(addon).toMatch(/\*italics\*/);
    expect(addon).toMatch(/bullet lists/i);
    expect(addon).toMatch(/not custom highlight syntax/i);
    expect(addon).toContain(
      "**Important:** The available Season 8 information contains differing dates. Please verify the current deadline through MTN's official Heroes of Change channels."
    );
    expect(addon).toMatch(/TEXT ONLY/);
    expect(addon).not.toMatch(/0549767070/);
    expect(addon).not.toMatch(/==/);
  });
});
