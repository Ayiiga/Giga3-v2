import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  enqueueOutbox,
  listOutbox,
  newClientRequestId,
  removeOutbox,
} from "../../web/lib/chat/offlineOutbox";
import { resolvePendingDeliveryState } from "../../web/lib/chat/outboxUi";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

const hasIndexedDb = typeof indexedDB !== "undefined";

describe("chat offline outbox remediation wiring", () => {
  it("represents queued vs sending delivery states for pending bubble", () => {
    const entries = [
      {
        id: "a",
        clientRequestId: "a",
        conversationId: null,
        content: "Hello offline",
        mode: "general",
        attempts: 0,
        createdAt: 1,
      },
    ];
    expect(resolvePendingDeliveryState("Hello offline", entries, null)).toBe("queued");
    expect(resolvePendingDeliveryState("Hello offline", entries, "a")).toBe("sending");
    expect(resolvePendingDeliveryState("Other text", entries, "a")).toBe(null);
  });

  it("wires cancel UI and dual-platform outbox parity", () => {
    expect(read("web/components/chat/ChatSyncBanner.tsx")).toContain("Cancel");
    expect(read("web/hooks/useChatPlatform.ts")).toContain("cancelOutboxMessage");
    expect(read("web/hooks/useSupabaseChatPlatform.ts")).toContain("cancelOutboxMessage");
    expect(read("web/components/chat/MessageBubble.tsx")).toContain(
      "Queued — waiting for connection"
    );
  });
});

describe.skipIf(!hasIndexedDb)("chat offline outbox remediation storage", () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase("giga3-chat-outbox");
    await new Promise((r) => setTimeout(r, 20));
  });

  it("cancels one queued message without removing others", async () => {
    const firstId = newClientRequestId();
    const secondId = newClientRequestId();
    await enqueueOutbox({
      id: firstId,
      clientRequestId: firstId,
      conversationId: "c1",
      content: "First queued message",
      mode: "general",
      attempts: 0,
      createdAt: Date.now(),
    });
    await enqueueOutbox({
      id: secondId,
      clientRequestId: secondId,
      conversationId: "c1",
      content: "Second queued message",
      mode: "general",
      attempts: 0,
      createdAt: Date.now(),
    });
    await removeOutbox(firstId);
    const remaining = await listOutbox();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe(secondId);
  });
});
