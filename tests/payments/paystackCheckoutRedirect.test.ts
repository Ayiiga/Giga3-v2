import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  openPaystackCheckout,
  resetPaystackCheckoutGuard,
  shouldPreferPaystackRedirect,
} from "../../web/lib/payments/paystackService";

function stubBrowser(matchQueries: string[]) {
  let redirectedTo = "";
  const matchMedia = (query: string) => ({
    matches: matchQueries.some((q) => query.includes(q)),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  const location = {
    get href() {
      return redirectedTo;
    },
    set href(value: string) {
      redirectedTo = value;
    },
  };
  vi.stubGlobal("window", {
    matchMedia,
    location,
  });
  vi.stubGlobal("navigator", { standalone: false });
  return () => redirectedTo;
}

describe("shouldPreferPaystackRedirect", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers redirect on coarse pointer (mobile)", () => {
    stubBrowser(["pointer: coarse"]);
    expect(shouldPreferPaystackRedirect()).toBe(true);
  });

  it("prefers redirect in standalone PWA", () => {
    stubBrowser(["display-mode: standalone"]);
    expect(shouldPreferPaystackRedirect()).toBe(true);
  });
});

describe("openPaystackCheckout mobile redirect", () => {
  const init = {
    authorizationUrl: "https://checkout.paystack.com/abc",
    accessCode: "access-code",
    reference: "ref-1",
    amountGhs: 10,
    label: "Mini Pack",
    mode: "live" as const,
  };

  afterEach(() => {
    resetPaystackCheckoutGuard();
    vi.unstubAllGlobals();
  });

  it("redirects immediately on mobile without opening inline popup", async () => {
    const getRedirectUrl = stubBrowser(["pointer: coarse"]);

    let redirectStarted = false;
    const mode = await openPaystackCheckout(init, {
      email: "user@example.com",
      publicKey: "pk_live_test",
      onRedirectStarting: () => {
        redirectStarted = true;
      },
      onSuccess: () => {},
      onCancel: () => {},
      onError: () => {},
    });

    expect(mode).toBe("redirect");
    expect(redirectStarted).toBe(true);
    expect(getRedirectUrl()).toBe("https://checkout.paystack.com/abc");
  });
});
