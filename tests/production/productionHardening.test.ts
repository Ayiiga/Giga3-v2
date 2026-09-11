import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("production hardening regressions", () => {
  it("wraps notification bell in ConvexAppShell for provider safety", () => {
    const host = readFileSync(
      resolve(__dirname, "../../web/components/platform/PlatformChromeHost.tsx"),
      "utf8"
    );
    expect(host).toMatch(
      /showNotifications && sessionToken[\s\S]*ConvexAppShell[\s\S]*NotificationBellWithCount/
    );
  });

  it("keeps chat error boundary from leaking raw internal errors", () => {
    const boundary = readFileSync(
      resolve(__dirname, "../../web/components/chat/ChatErrorBoundary.tsx"),
      "utf8"
    );
    expect(boundary).toContain("toUserFacingError");
    expect(boundary).not.toContain("raw.slice");
  });

  it("uses FREE_STARTER_CREDITS in ai-for-ghana metadata description", () => {
    const page = readFileSync(
      resolve(__dirname, "../../web/app/(marketing)/ai-for-ghana/page.tsx"),
      "utf8"
    );
    expect(page).toContain("${FREE_STARTER_CREDITS} credits");
    expect(page).not.toContain("Start free with 25 credits");
  });
});
