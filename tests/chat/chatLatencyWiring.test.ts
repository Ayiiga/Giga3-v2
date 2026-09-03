import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { chatSystemProfile } from "../../convex/providerRouter";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("chat latency — provider side", () => {
  it("disables Gemini 2.5 thinking for fast/vision/creator and bounds it for smart/pro", () => {
    expect(chatSystemProfile("fast").geminiThinkingBudget).toBe(0);
    expect(chatSystemProfile("vision").geminiThinkingBudget).toBe(0);
    expect(chatSystemProfile("creator").geminiThinkingBudget).toBe(0);
    expect(chatSystemProfile("smart").geminiThinkingBudget).toBeGreaterThan(0);
    expect(chatSystemProfile("pro").geminiThinkingBudget).toBeGreaterThan(0);
    const engine = read("convex/chatEngine.ts");
    expect(engine).toContain("thinkingConfig: { thinkingBudget }");
    expect(engine).toContain("supportsGeminiThinkingConfig(model)");
  });

  it("runs providers hedged instead of strictly sequential", () => {
    const engine = read("convex/chatEngine.ts");
    expect(engine).toContain("runHedgedAttempts(");
    expect(engine).toContain("resolveHedgeDelayMs()");
    expect(engine).not.toContain("shouldStartFailoverAttempt");
  });
});

describe("chat latency — worker round trips", () => {
  const worker = read("convex/chatReplyWorker.ts");

  it("loads conversation, history, recap and user in one query", () => {
    expect(worker).toContain("internal.platform.loadReplyContextInternal");
    expect(worker).not.toContain("internal.platform.listConversationMessagesInternal");
    expect(worker).not.toContain("internal.platform.listSegmentRecapInternal");
    expect(worker).not.toContain("internal.platform.getConversationInternal");
    expect(worker).toContain("internal.chatReplyJobs.beginProcessing");
  });

  it("persists the reply (transactional dedupe) BEFORE quality analytics", () => {
    const persistIdx = worker.indexOf("internal.platform.appendAssistantReplyIfMissing");
    const metricIdx = worker.indexOf("internal.qualityDashboard.recordResponseMetric");
    expect(persistIdx).toBeGreaterThan(-1);
    expect(metricIdx).toBeGreaterThan(persistIdx);
    expect(worker).not.toMatch(/const replyExists = await ctx\.runQuery\(\s*internal\.chatReplyJobs\.hasAssistantReplySince/);
  });

  it("bounds history and dedupe scans with the index instead of full collects", () => {
    const platform = read("convex/platform.ts");
    expect(platform).toMatch(/loadReplyContextInternal[\s\S]*\.order\("desc"\)\s*\.take\(limit \+ 8\)/);
    expect(platform).toMatch(/appendAssistantReplyIfMissing[\s\S]*\.order\("desc"\)\s*\.take\(6\)/);
    const jobs = read("convex/chatReplyJobs.ts");
    expect(jobs).toMatch(/hasAssistantReplySince[\s\S]*\.take\(6\)/);
    const messaging = read("convex/chatMessaging.ts");
    expect(messaging).toContain(".take(segmentLimit * 2 + 8)");
  });
});

describe("chat latency — client on slow networks", () => {
  it("polls the small status query every tick and the full thread only when needed", () => {
    const poll = read("web/hooks/useChatReplyPolling.ts");
    expect(poll).toContain("FULL_FETCH_EVERY_N_POLLS");
    expect(poll).toContain("justFinished");
    expect(poll).not.toMatch(/Promise\.all\(\[\s*convexHttpCall<PolledMessageRow\[\]>/);
  });

  it("chooses the freshest message source between live subscription and poll", () => {
    const hook = read("web/hooks/useChatPlatform.ts");
    expect(hook).toContain("Prefer whichever source has the newest message");
    expect(hook).toContain('import { logChatClient } from "@/lib/chat/chatLog";');
  });

  it("guards against undefined identifiers shipping (next build ignores TS errors)", () => {
    expect(read("web/package.json")).toContain('"check:undefined"');
    expect(read(".github/workflows/pages.yml")).toContain("npm run check:undefined");
    expect(read("web/components/gigasocial/GigaSocialPublicProfileClient.tsx")).toContain(
      'import { cn } from "@/lib/utils";'
    );
  });
});
