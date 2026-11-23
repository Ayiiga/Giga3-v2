import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("chat image previews and offline outbox recovery", () => {
  it("does not hide local uploaded image previews behind the data-saver placeholder", () => {
    const media = readFileSync(
      resolve(__dirname, "../../web/components/chat/MessageMediaBlock.tsx"),
      "utf8"
    );
    expect(media).toContain('const isLocalPreview = /^(data:|blob:)/i.test(url)');
    expect(media).toContain("!isLocalPreview");
    expect(media).toContain("Tap to load image (saves data)");
  });

  it("preserves queued messages after repeated mobile network failures", () => {
    for (const path of [
      "../../web/hooks/useChatPlatform.ts",
      "../../web/hooks/useSupabaseChatPlatform.ts",
    ]) {
      const hook = readFileSync(resolve(__dirname, path), "utf8");
      expect(hook).toContain("async (force = false)");
      expect(hook).toContain("(!force && !effectiveOnline)");
      expect(hook).toContain("retryOutboxSync: () => flushOutbox(true)");
      expect(hook).toMatch(/Keep queued messages|Never discard a queued message/);
      expect(hook).not.toMatch(/row\.attempts \+ 1 >= maxOutboxAttempts/);
      expect(hook).not.toMatch(/row\.attempts \+ 1 >= maxSendRetries/);
    }
  });

  it("retains attachment payloads in the offline outbox", () => {
    const outbox = readFileSync(
      resolve(__dirname, "../../web/lib/chat/offlineOutbox.ts"),
      "utf8"
    );
    expect(outbox).toContain("attachments?: OutboxAttachment[]");
    expect(outbox).toContain("dataUrl?: string");
  });
});
