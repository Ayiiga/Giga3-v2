import { describe, expect, it } from "vitest";
import {
  isPlatformOwnerEmail,
  PLATFORM_OWNER_EMAIL,
} from "@/lib/platformAdmin";

describe("platformAdmin client", () => {
  it("defines the platform owner email", () => {
    expect(PLATFORM_OWNER_EMAIL).toBe("ayiiga3@gmail.com");
  });

  it("matches owner email case-insensitively", () => {
    expect(isPlatformOwnerEmail("ayiiga3@gmail.com")).toBe(true);
    expect(isPlatformOwnerEmail("Ayiiga3@Gmail.com")).toBe(true);
    expect(isPlatformOwnerEmail("other@example.com")).toBe(false);
    expect(isPlatformOwnerEmail(null)).toBe(false);
  });
});
