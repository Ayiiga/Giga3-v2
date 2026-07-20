import { afterEach, describe, expect, it } from "vitest";
import { isPlatformAdminEmail } from "../../convex/platformAdmin";

describe("platformAdmin", () => {
  const original = process.env.PLATFORM_ADMIN_EMAILS;

  afterEach(() => {
    if (original === undefined) delete process.env.PLATFORM_ADMIN_EMAILS;
    else process.env.PLATFORM_ADMIN_EMAILS = original;
  });

  it("matches configured admin emails case-insensitively", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "ayiiga3@gmail.com, Admin@Example.com";
    expect(isPlatformAdminEmail("ayiiga3@gmail.com")).toBe(true);
    expect(isPlatformAdminEmail("admin@example.com")).toBe(true);
    expect(isPlatformAdminEmail("other@example.com")).toBe(false);
  });

  it("returns false when env is unset", () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;
    expect(isPlatformAdminEmail("ayiiga3@gmail.com")).toBe(false);
  });
});
