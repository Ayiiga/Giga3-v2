import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("replicate video input", () => {
  it("never sends UI durations above the Seedance 15s ceiling", () => {
    const source = read("convex/replicateClient.ts");
    expect(source).toContain("clampReplicateVideoDurationSec(options?.duration)");
    expect(source).not.toContain("clampMediaVideoDurationSec(options.duration)");
  });
});
