import { describe, expect, it } from "vitest";
import { safePostLoginPath } from "../../web/lib/auth/safePostLoginPath";

describe("safePostLoginPath", () => {
  it("allows same-site relative destinations including query strings", () => {
    expect(safePostLoginPath("/gigalearn/academy/course/?slug=mobile-app-development")).toBe(
      "/gigalearn/academy/course/?slug=mobile-app-development"
    );
    expect(safePostLoginPath("/chat")).toBe("/chat");
  });

  it("rejects open redirects and login loops", () => {
    expect(safePostLoginPath("https://evil.example/phish")).toBe("/chat/");
    expect(safePostLoginPath("//evil.example/phish")).toBe("/chat/");
    expect(safePostLoginPath("/chat/login/?next=/wallet/")).toBe("/chat/");
    expect(safePostLoginPath("javascript:alert(1)")).toBe("/chat/");
  });
});
