import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("GigaSocial live reliability guards", () => {
  it("keeps host gifting blocked in UI and backend, with user-facing copy", () => {
    const room = read("web/components/gigasocial/live/GigaSocialLiveRoom.tsx");
    const live = read("convex/gigaSocialLive.ts");
    const messages = read("web/lib/gigasocial/liveStreaming.ts");

    expect(room).toContain("Hosts cannot send gifts to themselves");
    expect(live).toContain("You cannot gift yourself.");
    expect(messages).toContain("You cannot send a gift to yourself.");
  });

  it("adds duplicate-charge protection for retried live gifts", () => {
    const live = read("convex/gigaSocialLive.ts");
    expect(live).toContain("clientGiftNonce");
    expect(live).toContain("live-gift:${args.streamId}");
    expect(live).toContain("duplicate: true");
    expect(live).toContain("duplicateByFingerprint");
    expect(live).toContain("withIndex(\"by_user_created\"");
  });

  it("uses MIME fallback and timeout in storage upload preparation", () => {
    const storage = read("convex/gigaSocialStorage.ts");
    expect(storage).toContain("normalizeImageContentType");
    expect(storage).toContain("normalizeVideoContentType");
    expect(storage).toContain("fetchWithTimeout");
    expect(storage).toContain("8_000");
  });
});
