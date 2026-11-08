import { describe, expect, it } from "vitest";
import { getScheduledChatBackground } from "../../web/lib/chat/scheduledChatBackground";

function accraDate(iso: string) {
  return new Date(iso);
}

describe("scheduled chat backgrounds (Africa/Accra)", () => {
  it("activates the correct background on Wednesday, Friday, Saturday and Sunday", () => {
    expect(getScheduledChatBackground(accraDate("2026-11-04T06:30:00Z"))).toBe("/chat-backgrounds/wednesday-heritage.svg");
    expect(getScheduledChatBackground(accraDate("2026-11-06T15:30:00Z"))).toBe("/chat-backgrounds/friday-makkah.svg");
    expect(getScheduledChatBackground(accraDate("2026-11-07T07:00:00Z"))).toBe("/chat-backgrounds/saturday-cross.svg");
    expect(getScheduledChatBackground(accraDate("2026-11-08T06:30:00Z"))).toBe("/chat-backgrounds/sunday-catholic.svg");
  });

  it("uses both inclusive-start, exclusive-end windows in Ghana time", () => {
    expect(getScheduledChatBackground(accraDate("2026-11-08T06:00:00Z"))).toBe("/chat-backgrounds/sunday-catholic.svg");
    expect(getScheduledChatBackground(accraDate("2026-11-08T08:00:00Z"))).toBeNull();
    expect(getScheduledChatBackground(accraDate("2026-11-08T15:00:00Z"))).toBe("/chat-backgrounds/sunday-catholic.svg");
    expect(getScheduledChatBackground(accraDate("2026-11-08T16:00:00Z"))).toBeNull();
  });

  it("returns the normal background outside scheduled days and hours", () => {
    expect(getScheduledChatBackground(accraDate("2026-11-09T06:30:00Z"))).toBeNull();
    expect(getScheduledChatBackground(accraDate("2026-11-08T12:00:00Z"))).toBeNull();
  });

  it("uses Ghana time independently of the device timezone", () => {
    expect(getScheduledChatBackground(accraDate("2026-11-08T06:30:00Z"))).toBe("/chat-backgrounds/sunday-catholic.svg");
  });
});
