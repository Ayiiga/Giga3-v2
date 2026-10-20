import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("FAL_IMAGE_MODEL default", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("defaults to fal-ai/flux/schnell when FAL_IMAGE_MODEL env is unset", async () => {
    vi.stubEnv("FAL_IMAGE_MODEL", "");
    delete process.env.FAL_IMAGE_MODEL;
    vi.resetModules();
    const { FAL_IMAGE_MODEL } = await import("../../convex/mediaCatalog");
    expect(FAL_IMAGE_MODEL).toBe("fal-ai/flux/schnell");
  });

  it("keeps code defaults and CI sync on flux/schnell (not a premium fal primary)", () => {
    const premiumPrimary = "fal-ai/" + "nano-banana-pro";
    for (const path of [
      "convex/mediaEngine.ts",
      "convex/falClient.ts",
      "convex/mediaCatalog.ts",
      ".github/workflows/convex-deploy.yml",
      "DEPLOYMENT.md",
      "scripts/convex-env-ai-providers.sh",
    ]) {
      const src = read(path);
      expect(src, path).toContain("fal-ai/flux/schnell");
      // Catalog/engine/CI must not hardcode the premium fal primary as the silent default.
      if (path === "convex/mediaCatalog.ts") {
        expect(src).toMatch(
          /FAL_IMAGE_MODEL\s*=\s*\n?\s*process\.env\.FAL_IMAGE_MODEL\?\.trim\(\) \|\| "fal-ai\/flux\/schnell"/
        );
      }
      if (
        path === ".github/workflows/convex-deploy.yml" ||
        path === "scripts/convex-env-ai-providers.sh"
      ) {
        expect(src).toContain("${FAL_IMAGE_MODEL:-fal-ai/flux/schnell}");
        expect(src).not.toContain(`env set FAL_IMAGE_MODEL "${premiumPrimary}"`);
      } else {
        expect(src, path).not.toContain(`FAL_IMAGE_MODEL?.trim() || "${premiumPrimary}"`);
        expect(src, path).not.toContain(`FAL_IMAGE_MODEL ?? "${premiumPrimary}"`);
      }
    }
  });

  it("skips fal for source-image edits so Replicate/Gemini handle image-to-image", () => {
    const engine = read("convex/mediaEngine.ts");
    expect(engine).toContain("fal text-to-image only");
    expect(engine).toContain("getFalApiKey() && !sourceImageUrl");
  });
});
