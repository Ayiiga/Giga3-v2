import { describe, expect, it } from "vitest";
import {
  CREATE_SUB_DESTINATIONS,
  isCreateSubRoute,
  resolveCreateSubDestination,
} from "../../web/lib/navigation/createDestinations";

describe("createDestinations", () => {
  it("has no dedicated Create sub-destinations after education-first retirement", () => {
    expect(CREATE_SUB_DESTINATIONS).toEqual([]);
    expect(resolveCreateSubDestination("/media")).toBeNull();
    expect(resolveCreateSubDestination("/gigaedit")).toBeNull();
    expect(isCreateSubRoute("/gigaedit/")).toBe(false);
    expect(isCreateSubRoute("/chat")).toBe(false);
  });
});
