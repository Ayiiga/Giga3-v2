import { describe, expect, it } from "vitest";
import {
  isChatAppPath,
  shouldSuppressInstallPrompt,
  shouldSuppressPushPrompt,
} from "../../web/lib/pwa/installPromptPaths";

describe("shouldSuppressInstallPrompt", () => {
  it("suppresses on auth, payment, install, and active chat routes", () => {
    expect(shouldSuppressInstallPrompt("/install")).toBe(true);
    expect(shouldSuppressInstallPrompt("/chat/login")).toBe(true);
    expect(shouldSuppressInstallPrompt("/payment/success")).toBe(true);
    expect(shouldSuppressInstallPrompt("/wallet")).toBe(true);
    expect(shouldSuppressInstallPrompt("/admin")).toBe(true);
    expect(shouldSuppressInstallPrompt("/chat")).toBe(true);
    expect(shouldSuppressInstallPrompt("/chat/")).toBe(true);
    expect(shouldSuppressInstallPrompt("/chat/?c=abc")).toBe(true);
  });

  it("allows on primary non-chat app surfaces", () => {
    expect(shouldSuppressInstallPrompt("/")).toBe(false);
    expect(shouldSuppressInstallPrompt("/gigasocial")).toBe(false);
    expect(shouldSuppressInstallPrompt("/gigalearn")).toBe(false);
    expect(shouldSuppressInstallPrompt("/media")).toBe(false);
  });
});

describe("chat distraction-free overlays", () => {
  it("treats /chat as the active chat app path", () => {
    expect(isChatAppPath("/chat")).toBe(true);
    expect(isChatAppPath("/chat/")).toBe(true);
    expect(isChatAppPath("/media")).toBe(false);
  });

  it("suppresses push prompts on the same routes as install", () => {
    expect(shouldSuppressPushPrompt("/chat")).toBe(true);
    expect(shouldSuppressPushPrompt("/")).toBe(false);
  });
});
