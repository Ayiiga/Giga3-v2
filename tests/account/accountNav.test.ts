import { describe, expect, it } from "vitest";
import { ACCOUNT_SETTINGS_NAV } from "../../web/lib/account/accountNav";

describe("account settings nav", () => {
  it("lists the account destinations moved out of the chat sidebar", () => {
    expect(ACCOUNT_SETTINGS_NAV.map((item) => item.label)).toEqual([
      "GigaWallet",
      "Workspace",
      "Subscription",
      "Credits",
      "Dashboard",
      "Help Center",
    ]);
    for (const item of ACCOUNT_SETTINGS_NAV) {
      expect(item.href.length).toBeGreaterThan(1);
      expect(item.description.length).toBeGreaterThan(3);
    }
  });
});
