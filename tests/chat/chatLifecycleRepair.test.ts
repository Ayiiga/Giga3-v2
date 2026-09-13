import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("chat lifecycle repair wiring", () => {
  it("claims jobs atomically in beginProcessing", () => {
    const jobs = read("convex/chatReplyJobs.ts");
    expect(jobs).toContain("claimed: false");
    expect(jobs).toContain("STALE_PROCESSING_MS");
    expect(jobs).toContain('job.status === "processing"');
  });

  it("skips duplicate workers when claim fails", () => {
    expect(read("convex/chatReplyWorker.ts")).toContain("worker_skip_duplicate");
    expect(read("convex/chatConversationalReply.ts")).toContain(
      "conversational_worker_skip_duplicate"
    );
  });

  it("recovery finalizes through appendAssistantReplyIfMissing", () => {
    const recovery = read("convex/chatReplyRecovery.ts");
    expect(recovery).toContain("internal.platform.appendAssistantReplyIfMissing");
    expect(recovery).not.toContain("couldn't finish this reply because our AI service didn't respond in time");
  });

  it("quick reply creates a durable conversational job", () => {
    const quick = read("convex/chatQuickReply.ts");
    expect(quick).toContain("internal.chatReplyJobs.createJob");
    expect(quick).toContain('kind: "conversational"');
    expect(quick).toContain("internal.chatConversationalReply.processTurn");
  });

  it("exposes idempotent retryFailedReply mutation", () => {
    const messaging = read("convex/chatMessaging.ts");
    expect(messaging).toContain("export const retryFailedReply = mutation");
    expect(messaging).toContain("isChatAssistantFailureStub");
    expect(messaging).not.toMatch(/retryFailedReply[\s\S]*insert\("messages"[\s\S]*role: "user"/);
  });
});
