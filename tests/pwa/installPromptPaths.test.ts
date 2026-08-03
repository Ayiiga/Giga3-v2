import { describe, expect, it } from "vitest";
import { shouldSuppressInstallPrompt } from "../../web/lib/pwa/installPromptPaths";

describe("shouldSuppressInstallPrompt", () => {
  it("suppresses on auth, payment, and install routes", () => {
    expect(shouldSuppressInstallPrompt("/install")).toBe(true);
    expect(shouldSuppressInstallPrompt("/chat/login")).toBe(true);
    expect(shouldSuppressInstallPrompt("/payment/success")).toBe(true);
    expect(shouldSuppressInstallPrompt("/wallet")).toBe(true);
    expect(shouldSuppressInstallPrompt("/admin")).toBe(true);
  });

  it("allows on primary app surfaces", () => {
    expect(shouldSuppressInstallPrompt("/")).toBe(false);
    expect(shouldSuppressInstallPrompt("/chat")).toBe(false);
    expect(shouldSuppressInstallPrompt("/gigasocial")).toBe(false);
  });
});
