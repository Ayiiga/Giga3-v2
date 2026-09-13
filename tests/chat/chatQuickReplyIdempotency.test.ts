import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../..");

describe("insertConversationalTurn idempotency", () => {
  it("dedupes by clientRequestId via chatReplyJobs before inserting user rows", () => {
    const source = readFileSync(
      join(root, "convex/chatQuickReplyMutations.ts"),
      "utf8"
    );
    expect(source).toContain('withIndex("by_clientRequest"');
    expect(source).toContain("resolveExistingQuickReplyTurn");
    expect(source).toMatch(
      /if \(args\.clientRequestId\)[\s\S]*resolveExistingQuickReplyTurn[\s\S]*if \(existing\)/
    );
    expect(source).toContain('kind: "conversational"');
    expect(source).toContain("clientRequestId: args.clientRequestId");
  });

  it("quick reply action uses the job returned from insertConversationalTurn", () => {
    const source = readFileSync(join(root, "convex/chatQuickReply.ts"), "utf8");
    expect(source).toContain("const jobId = setup.jobId");
    expect(source).not.toContain("internal.chatReplyJobs.createJob");
  });
});

describe("client quick reply send safety", () => {
  it("does not retry quick reply HTTP calls", () => {
    const chatPlatform = readFileSync(
      join(root, "web/hooks/useChatPlatform.ts"),
      "utf8"
    );
    expect(chatPlatform).toContain("sendInFlightRef");
    expect(chatPlatform).toContain("send_blocked_inflight");
    expect(chatPlatform).toMatch(
      /chatQuickReply:conversational[\s\S]*retries: 0/
    );
    expect(chatPlatform).toContain("!useQuickReply &&");

    const supabasePlatform = readFileSync(
      join(root, "web/hooks/useSupabaseChatPlatform.ts"),
      "utf8"
    );
    expect(supabasePlatform).toMatch(
      /chatQuickReply:conversational[\s\S]*retries: 0/
    );
  });
});
