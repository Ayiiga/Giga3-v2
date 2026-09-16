import { describe, expect, it } from "vitest";
import {
  CREATE_SUB_DESTINATIONS,
  isCreateSubRoute,
  resolveCreateSubDestination,
} from "../../web/lib/navigation/createDestinations";

describe("createDestinations", () => {
  it("lists Media Studio and GigaEdits under Create", () => {
    expect(CREATE_SUB_DESTINATIONS.map((d) => d.id)).toEqual(["media", "gigaedit"]);
    expect(CREATE_SUB_DESTINATIONS[0].href).toContain("/media");
    expect(CREATE_SUB_DESTINATIONS[1].href).toContain("/gigaedit");
  });

  it("resolves create sub-routes from pathname", () => {
    expect(resolveCreateSubDestination("/media")).toBe("media");
    expect(resolveCreateSubDestination("/media/?tab=video")).toBe("media");
    expect(resolveCreateSubDestination("/gigaedit")).toBe("gigaedit");
    expect(resolveCreateSubDestination("/gigaedit/?tab=teleprompter")).toBe("gigaedit");
    expect(isCreateSubRoute("/gigaedit/")).toBe(true);
    expect(isCreateSubRoute("/chat")).toBe(false);
  });
});
