import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("production audit limitation fixes", () => {
  it("keeps media SSR shell visible with inline sign-in instead of redirect", () => {
    const mediaClient = readFileSync(
      resolve(__dirname, "../../web/components/media/MediaStudioClient.tsx"),
      "utf8"
    );
    expect(mediaClient).toContain("ProductSignInPrompt");
    expect(mediaClient).not.toContain('router.replace("/chat/login?next=/media")');
  });

  it("keeps gigalearn SSR shell visible with inline sign-in instead of redirect", () => {
    const gigaLearn = readFileSync(
      resolve(__dirname, "../../web/components/gigalearn/GigaLearnClient.tsx"),
      "utf8"
    );
    expect(gigaLearn).toContain("ProductSignInPrompt");
    expect(gigaLearn).not.toContain('router.replace("/chat/login?next=/gigalearn")');
  });

  it("exposes Premium API key self-serve UI on developers page", () => {
    const developers = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/developers/page.tsx"),
      "utf8"
    );
    const panel = readFileSync(
      resolve(__dirname, "../../web/components/developer/DeveloperApiKeysPanel.tsx"),
      "utf8"
    );
    expect(developers).toContain("DeveloperApiKeysPanel");
    expect(developers).toContain('id="user-api-keys"');
    expect(panel).toContain("api.apiKeysActions.createKey");
    expect(panel).toContain("api.apiKeys.revokeKey");
  });

  it("uses hydration notice on pricing checkout panel", () => {
    const pricing = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/pricing/page.tsx"),
      "utf8"
    );
    expect(pricing).toContain("ClientAppHydrationNotice");
    expect(pricing).not.toMatch(/Loading…/);
  });
});
