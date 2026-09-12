import { describe, expect, it } from "vitest";
import {
  CHAT_REPLY_WAIT_MS,
  CHAT_REPLY_WAIT_SLOW_MS,
} from "../../web/lib/chat/chatNetwork";
import { getJobRecoveryConfig } from "../../convex/chatReplyRecoveryPolicy";
import {
  chatJobProcessingBudgetMs,
  chatRecoveryProcessingGiveUpAfterMs,
} from "../../convex/chatTiming";

describe("chat timing alignment", () => {
  it("keeps client reply wait above server processing recovery budget", () => {
    const serverBudget = chatRecoveryProcessingGiveUpAfterMs();
    expect(CHAT_REPLY_WAIT_MS).toBeGreaterThan(serverBudget);
    expect(CHAT_REPLY_WAIT_SLOW_MS).toBeGreaterThan(CHAT_REPLY_WAIT_MS);
  });

  it("accounts for live web and verification before the AI worker timeout", () => {
    const budget = chatJobProcessingBudgetMs({ hasImageAttachment: true });
    expect(budget).toBeGreaterThanOrEqual(180_000 + 60_000 + 45_000);
  });

  it("reads recovery env at call time via getJobRecoveryConfig", () => {
    const cfg = getJobRecoveryConfig({
      CHAT_JOB_PROCESSING_GIVE_UP_AFTER_MS: "420000",
    });
    expect(cfg.processingGiveUpAfterMs).toBe(420_000);
  });
});
