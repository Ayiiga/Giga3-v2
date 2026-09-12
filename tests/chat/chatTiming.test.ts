import { describe, expect, it } from "vitest";
import {
  CHAT_REPLY_WAIT_MS,
  CHAT_REPLY_WAIT_SLOW_MS,
} from "../../web/lib/chat/chatNetwork";
import { chatJobProcessingBudgetMs } from "../../convex/chatTiming";
import { DEFAULT_JOB_RECOVERY_CONFIG } from "../../convex/chatReplyRecoveryPolicy";

describe("chat timing alignment", () => {
  it("keeps client reply wait above server processing recovery budget", () => {
    expect(CHAT_REPLY_WAIT_MS).toBeGreaterThan(
      DEFAULT_JOB_RECOVERY_CONFIG.processingGiveUpAfterMs
    );
    expect(CHAT_REPLY_WAIT_SLOW_MS).toBeGreaterThan(CHAT_REPLY_WAIT_MS);
  });

  it("accounts for live web and verification before the AI worker timeout", () => {
    const budget = chatJobProcessingBudgetMs({ hasImageAttachment: true });
    expect(budget).toBeGreaterThanOrEqual(150_000 + 60_000 + 45_000);
  });
});
