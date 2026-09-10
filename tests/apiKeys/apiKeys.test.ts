import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { API_KEY_SCOPES } from "../../convex/apiKeys";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("developer API keys", () => {
  it("defines scopes and hashed storage", () => {
    expect(API_KEY_SCOPES.length).toBeGreaterThan(0);
    expect(read("convex/schema.ts")).toContain("apiKeys:");
    expect(read("convex/schema.ts")).toContain("apiKeyUsageDaily:");
    expect(read("convex/apiKeysActions.ts")).toContain("hashApiKey");
  });

  it("gates key creation on api_access entitlement", () => {
    expect(read("convex/apiKeys.ts")).toContain("assertApiAccessInternal");
    expect(read("convex/apiKeysActions.ts")).toContain("createKey");
  });

  it("exposes authenticated HTTP me endpoint", () => {
    expect(read("convex/http.ts")).toContain("/api/v1/me");
    expect(read("convex/developerApi.ts")).toContain("developerApiMe");
  });
});
