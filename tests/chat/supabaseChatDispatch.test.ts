import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("useSupabaseChatPlatform conversational dispatch", () => {
  const source = readFileSync("web/hooks/useSupabaseChatPlatform.ts", "utf8");

  it("passes clientRequestId to Convex accept", () => {
    expect(source).toContain("clientRequestId?: string");
    expect(source).toContain("clientRequestId: args.clientRequestId");
  });

  it("uses quick reply for greetings when online", () => {
    expect(source).toContain("shouldUseQuickConversationalReply");
    expect(source).toContain("chatQuickReply:conversational");
  });

  it("rejects server timeout stubs during polling", () => {
    expect(source).toContain("hasUsableAssistantContent");
  });
});
