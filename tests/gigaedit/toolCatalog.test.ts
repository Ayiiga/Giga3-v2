import { describe, expect, it } from "vitest";
import {
  featuredGigaEditTools,
  GIGAEDIT_TOOL_CATALOG,
  resolveGigaEditToolHref,
  toolsForCategory,
} from "../../web/lib/gigaedit/toolCatalog";
import { parseImageStudioActionId } from "../../web/lib/chat/imageStudioLinks";
import {
  appendRemixMarker,
  parseRemixMeta,
  GIGA_REMIX_MODES,
} from "../../web/lib/gigasocial/remixMeta";

describe("GigaEdit tool catalog", () => {
  it("includes the professional toolkit surface", () => {
    expect(GIGAEDIT_TOOL_CATALOG.length).toBeGreaterThanOrEqual(24);
    expect(featuredGigaEditTools().length).toBeGreaterThanOrEqual(6);
    expect(toolsForCategory("photo").some((t) => t.id === "background-remover")).toBe(
      true
    );
  });

  it("resolves media tools to Media Studio deep links", () => {
    const tool = GIGAEDIT_TOOL_CATALOG.find((t) => t.id === "hd-upscale");
    expect(tool).toBeTruthy();
    const href = resolveGigaEditToolHref(tool!);
    expect(href).toContain("/media?");
    expect(href).toContain("action=upscale");
  });

  it("keeps new image studio actions parseable", () => {
    expect(parseImageStudioActionId("face-enhance")).toBe("face-enhance");
    expect(parseImageStudioActionId("poster")).toBe("poster");
    expect(parseImageStudioActionId("nope")).toBeNull();
  });
});

describe("Giga Remix modes", () => {
  it("encodes and parses remix mode markers", () => {
    expect(GIGA_REMIX_MODES.length).toBeGreaterThanOrEqual(8);
    const body = appendRemixMarker("Hello", "post123", "split-view");
    expect(body).toContain("[giga-remix:post123:split-view]");
    expect(parseRemixMeta(body)).toEqual({
      sourcePostId: "post123",
      mode: "split-view",
    });
  });

  it("stays backward compatible with classic markers", () => {
    expect(parseRemixMeta("x\n[giga-remix:abc99]")).toEqual({
      sourcePostId: "abc99",
      mode: "classic",
    });
  });
});
