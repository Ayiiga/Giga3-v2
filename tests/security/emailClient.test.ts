import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getAuthFromEmail,
  getFrontendBaseUrl,
  isEmailDeliveryConfigured,
  wrapEmailHtml,
} from "../../convex/emailClient";

describe("emailClient helpers", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.AUTH_FROM_EMAIL;
    delete process.env.FRONTEND_URL;
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it("reports delivery as unconfigured without RESEND_API_KEY", () => {
    expect(isEmailDeliveryConfigured()).toBe(false);
    process.env.RESEND_API_KEY = "re_test";
    expect(isEmailDeliveryConfigured()).toBe(true);
  });

  it("uses production frontend and from defaults", () => {
    expect(getFrontendBaseUrl()).toBe("https://www.giga3ai.com");
    expect(getAuthFromEmail()).toContain("onboarding@resend.dev");
  });

  it("wraps branded HTML for transactional mail", () => {
    const html = wrapEmailHtml({
      title: "Reset your password",
      bodyHtml: "<p>Click below</p>",
    });
    expect(html).toContain("Reset your password");
    expect(html).toContain("Giga3 AI");
    expect(html).toContain("Open Giga3 AI");
  });
});
