import { describe, expect, it } from "vitest";
import { isTestUserEmail } from "../../convex/cleanup";

describe("isTestUserEmail", () => {
  it("never deletes ayiiga3@gmail.com", () => {
    expect(isTestUserEmail("ayiiga3@gmail.com")).toBe(false);
    expect(isTestUserEmail("  Ayiiga3@Gmail.com  ")).toBe(false);
  });

  it("flags mailinator and example.com accounts", () => {
    expect(isTestUserEmail("pr412verifyA+123@mailinator.com")).toBe(true);
    expect(isTestUserEmail("test@example.com")).toBe(true);
    expect(isTestUserEmail("probe@example.com")).toBe(true);
  });

  it("flags known test prefixes", () => {
    expect(isTestUserEmail("audit412A+1@mailinator.com")).toBe(true);
    expect(isTestUserEmail("cursor-agent@example.com")).toBe(true);
    expect(isTestUserEmail("cloud-agent-run@example.com")).toBe(true);
  });

  it("does not delete ordinary Gmail users", () => {
    expect(isTestUserEmail("real.user@gmail.com")).toBe(false);
    expect(isTestUserEmail("john.doe@gmail.com")).toBe(false);
  });

  it("allows Gmail only when test pattern matches", () => {
    expect(isTestUserEmail("cursor-test@gmail.com")).toBe(true);
    expect(isTestUserEmail("pr412verify@gmail.com")).toBe(true);
  });
});
