import { describe, expect, it } from "vitest";
import { buildUiMessages, messagesEqual } from "../../web/lib/chat/stableMessages";

describe("stableMessages", () => {
  it("treats pending-user rows as equal when only createdAt changes", () => {
    const first = buildUiMessages([], "Hello");
    const second = buildUiMessages([], "Hello");
    expect(messagesEqual(first, second)).toBe(true);
  });

  it("detects pending-user content changes", () => {
    const first = buildUiMessages([], "Hello");
    const second = buildUiMessages([], "Hello again");
    expect(messagesEqual(first, second)).toBe(false);
  });
});
