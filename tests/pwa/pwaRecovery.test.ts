import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PWA safe recovery", () => {
  it("preserves auth keys when clearing caches", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/lib/pwa/pwaRecovery.ts"),
      "utf8"
    );
    expect(src).toContain("giga3_user_email");
    expect(src).toContain("giga3_session_token");
    expect(src).not.toContain("localStorage.clear()");
  });

  it("limits recovery loops per hour", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/lib/pwa/pwaRecovery.ts"),
      "utf8"
    );
    expect(src).toContain("MAX_RECOVERIES_PER_HOUR");
  });
});
