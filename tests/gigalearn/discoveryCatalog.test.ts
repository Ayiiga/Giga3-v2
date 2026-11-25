import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { discoveryAudioPath, discoveryDecks } from "../../web/components/gigalearn/discoveryObjects";

const publicDir = resolve(__dirname, "../../web/public");
const asset = (path: string) => resolve(publicDir, `.${path}`);

describe("Discovery World picture catalog", () => {
  it("provides 90 distinct cards in the five learner decks", () => {
    expect(Object.fromEntries(Object.entries(discoveryDecks).map(([key, cards]) => [key, cards.length]))).toEqual({
      fruit: 20,
      domestic: 20,
      wildlife: 20,
      body: 10,
      things: 20,
    });
    const cards = Object.values(discoveryDecks).flat();
    expect(new Set(cards.map(({ id }) => id)).size).toBe(90);
    expect(new Set(cards.map(({ image }) => image)).size).toBe(90);
  });

  it("bundles every picture, pronunciation and Fruit Finder prompt", () => {
    for (const { id, image } of Object.values(discoveryDecks).flat()) {
      const header = readFileSync(asset(image)).subarray(0, 12);
      expect(header.toString("ascii", 8), image).toBe("WEBP");
      expect(statSync(asset(`${discoveryAudioPath}/${id}.mp3`)).size, id).toBeGreaterThan(1_000);
    }
    for (const { id } of discoveryDecks.fruit) {
      expect(statSync(asset(`${discoveryAudioPath}/find-${id}.mp3`)).size, id).toBeGreaterThan(1_000);
    }
  });
});
