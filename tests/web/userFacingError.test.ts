import { describe, expect, it } from "vitest";
import {
  stripConvexErrorNoise,
  toUserFacingError,
} from "../../web/lib/errors/userMessage";

describe("toUserFacingError", () => {
  it("strips Convex request wrappers from tip failures", () => {
    const raw =
      "[CONVEX M(gigaSocialEconomy:sendCreatorGift)] [Request ID: 5cbd01ce5640bb42] Server Error Uncaught Error: This creator has not unlocked the Gifts Hub yet. at handler (../../convex/gigaSocialEconomy.ts:463:20) Called by client";
    expect(stripConvexErrorNoise(raw)).toContain("Gifts Hub");
    expect(toUserFacingError(raw)).toBe(
      "This creator cannot receive tips yet. Please try again after refreshing."
    );
    expect(toUserFacingError(raw)).not.toContain("Request ID");
    expect(toUserFacingError(raw)).not.toContain("CONVEX");
  });

  it("strips Uncaught UnauthorizedError wrappers used by password auth", () => {
    const raw =
      "[Request ID: b43b80fe0c33054b] Server Error Uncaught UnauthorizedError: Incorrect email or password. at handler (../convex/authPasswordActions.ts:238:4)";
    expect(stripConvexErrorNoise(raw)).toBe("Incorrect email or password.");
  });
});

