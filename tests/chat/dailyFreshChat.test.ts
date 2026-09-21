import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  freshChatAction,
  localDayKey,
  msUntilNextLocalMidnight,
} from "../../web/lib/chat/dailyChat";
import { getDailySuggestedPrompts } from "../../web/lib/chat/suggestedPrompts";

describe("daily fresh chat", () => {
  it("uses the device calendar day", () => {
    expect(localDayKey(new Date(2026, 8, 21, 23, 30))).toBe("2026-09-21");
    expect(localDayKey(new Date(2026, 8, 22, 0, 5))).toBe("2026-09-22");
  });

  it("waits until the next local midnight", () => {
    const wait = msUntilNextLocalMidnight(new Date(2026, 8, 21, 23, 59, 0));
    expect(wait).toBe(60_000);
  });

  it("opens a new chat on a new day and keeps the same day in place", () => {
    expect(freshChatAction(null, "2026-09-21", false)).toBe("remember");
    expect(freshChatAction("2026-09-21", "2026-09-21", false)).toBe("same");
    expect(freshChatAction("2026-09-20", "2026-09-21", true)).toBe("wait");
    expect(freshChatAction("2026-09-20", "2026-09-21", false)).toBe("reset");
  });

  it("rotates the empty-chat prompts by day and keeps a day stable", () => {
    const monday = getDailySuggestedPrompts("general", 3, "2026-09-21").map((p) => p.label);
    const tuesday = getDailySuggestedPrompts("general", 3, "2026-09-22").map((p) => p.label);
    const again = getDailySuggestedPrompts("general", 3, "2026-09-21").map((p) => p.label);
    expect(monday).toHaveLength(3);
    expect(again).toEqual(monday);
    expect(tuesday).not.toEqual(monday);
    expect(tuesday[0]).toBe(monday[1]);
  });

  it("wires both chat platforms to the daily reset and segments at 30 generations", () => {
    const convex = readFileSync(
      resolve(__dirname, "../../convex/chatSegmentation.ts"),
      "utf8"
    );
    const platform = readFileSync(
      resolve(__dirname, "../../web/hooks/useChatPlatform.ts"),
      "utf8"
    );
    const supabase = readFileSync(
      resolve(__dirname, "../../web/hooks/useSupabaseChatPlatform.ts"),
      "utf8"
    );
    const messageList = readFileSync(
      resolve(__dirname, "../../web/components/chat/MessageList.tsx"),
      "utf8"
    );
    expect(convex).toContain("const DEFAULT_EXCHANGES = 30");
    expect(platform).toContain("useDailyFreshChat(openTodayChat, isSending || awaitingReply)");
    expect(platform).toContain("DAILY_FRESH_CHAT_NOTICE");
    expect(supabase).toContain("useDailyFreshChat(openTodayChat, isSending || awaitingReply)");
    expect(messageList).toContain("getDailySuggestedPrompts(mode, 3, dayKey)");
  });
});
