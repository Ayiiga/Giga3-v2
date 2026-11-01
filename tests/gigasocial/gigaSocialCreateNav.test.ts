import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("GigaSocial GigaEdits navigation", () => {
  it("replaces the mobile Create tile with a GigaEdits editor link", () => {
    const nav = readFileSync(
      resolve(root, "web/components/gigasocial/ux/GigaSocialContextNav.tsx"),
      "utf8"
    );
    const client = readFileSync(
      resolve(root, "web/components/gigasocial/GigaSocialClient.tsx"),
      "utf8"
    );

    expect(nav).toContain('aria-label="Open GigaEdits editor"');
    expect(nav).toContain("<span>GigaEdits</span>");
    expect(nav).toContain("Clapperboard");
    expect(client).toContain('router.push("/gigaedit/?continue=1")');
  });

  it("keeps the editor route non-indexable while exposing the active studio title", () => {
    const page = readFileSync(resolve(root, "web/app/(marketing)/gigaedit/page.tsx"), "utf8");
    const gate = readFileSync(
      resolve(root, "web/components/product/GigaEditRetiredGate.tsx"),
      "utf8"
    );

    expect(page).toContain('title: "GigaEdits Studio | Giga3 AI"');
    expect(page).toContain("index: false");
    expect(gate).toContain('params.get("continue") === "1"');
  });
});
