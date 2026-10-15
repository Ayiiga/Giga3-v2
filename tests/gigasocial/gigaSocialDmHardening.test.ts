import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCanAcceptDmRequest,
  assertCanDeclineDmRequest,
  assertDmNotBlocked,
  assertGigaSocialDmEnabled,
  DM_BLOCKED_MESSAGE,
  dmMessageIndexRange,
  paginateDmMessagesByCreatedAtDesc,
  shouldHideDmThreadForBlock,
} from "../../convex/gigaSocialDmPolicy";
import { ForbiddenError, ValidationError } from "../../convex/securityErrors";

const dmSrc = readFileSync(
  resolve(__dirname, "../../convex/gigaSocialDm.ts"),
  "utf8"
);
const gigaSocialSrc = readFileSync(
  resolve(__dirname, "../../convex/gigaSocial.ts"),
  "utf8"
);

function makeMessages(count: number, startAt = 1_000_000) {
  // Newest-first array as an index desc scan would yield.
  const newestFirst = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    newestFirst.push({
      messageId: `m${i}`,
      createdAt: startAt + i,
    });
  }
  return newestFirst;
}

describe("Phase 2E M1 — block policy", () => {
  it("hides threads and forbids access when blocked either way", () => {
    expect(shouldHideDmThreadForBlock(true)).toBe(true);
    expect(shouldHideDmThreadForBlock(false)).toBe(false);
    expect(() => assertDmNotBlocked(true)).toThrow(ForbiddenError);
    expect(() => assertDmNotBlocked(true)).toThrow(DM_BLOCKED_MESSAGE);
    expect(() => assertDmNotBlocked(false)).not.toThrow();
  });

  it("wires block checks into list/send/accept/message history handlers", () => {
    for (const name of ["listMyThreads", "listThreadMessages", "sendMessage", "acceptRequest"]) {
      const block =
        dmSrc.match(
          new RegExp(`export const ${name} = (?:query|mutation)\\([\\s\\S]*?\\n\\}\\);`)
        )?.[0] ?? "";
      expect(block, name).toMatch(/findBlockEitherWay|assertPairNotBlocked|assertDmNotBlocked/);
    }
    expect(dmSrc).toContain("shouldHideDmThreadForBlock");
    // Messages are not deleted on block
    expect(dmSrc).not.toMatch(/db\.delete\(.*socialDmMessages/);
    expect(dmSrc).toContain("Does not delete history");
  });

  it("keeps reportMessage participant-scoped without requiring unblock", () => {
    const block =
      dmSrc.match(/export const reportMessage = mutation\([\s\S]*?\n\}\);/)?.[0] ?? "";
    expect(block).toContain("assertDmThreadParticipant");
    expect(block).not.toContain("assertPairNotBlocked");
  });
});

describe("Phase 2E M2 — index-range pagination", () => {
  it("builds createdAtLt range for cursors", () => {
    expect(dmMessageIndexRange("t1")).toEqual({ threadId: "t1" });
    expect(dmMessageIndexRange("t1", 50)).toEqual({ threadId: "t1", createdAtLt: 50 });
    expect(() => dmMessageIndexRange("t1", Number.NaN)).toThrow(ValidationError);
  });

  it("uses index .lt(createdAt) in listThreadMessages (not post-filter take window)", () => {
    const block =
      dmSrc.match(/export const listThreadMessages = query\([\s\S]*?\n\}\);/)?.[0] ?? "";
    expect(block).toContain('.lt("createdAt"');
    expect(block).not.toContain("cap + 8");
    expect(block).not.toContain("rows.filter((m) => m.createdAt < args.cursor");
    expect(block).toContain("assertPairNotBlocked");
  });

  it("deep-paginates without skipping or duplicating across pages", () => {
    const all = makeMessages(120);
    const pageSize = 30;
    const seen = new Set<string>();
    let cursor: number | undefined;
    let pages = 0;
    for (;;) {
      const { page, nextCursor } = paginateDmMessagesByCreatedAtDesc(all, {
        cursor,
        limit: pageSize,
      });
      pages += 1;
      for (const m of page) {
        expect(seen.has(m.messageId)).toBe(false);
        seen.add(m.messageId);
      }
      if (nextCursor == null) break;
      // Repeated cursor must be stable
      const again = paginateDmMessagesByCreatedAtDesc(all, {
        cursor: nextCursor,
        limit: pageSize,
      });
      expect(again.page.map((m) => m.messageId)).toEqual(
        paginateDmMessagesByCreatedAtDesc(all, {
          cursor: nextCursor,
          limit: pageSize,
        }).page.map((m) => m.messageId)
      );
      cursor = nextCursor;
      expect(pages).toBeLessThan(20);
    }
    expect(seen.size).toBe(120);
    expect(pages).toBe(4);
  });

  it("empty intermediate cursor window is a real empty page, not false EOF from newest-only take", () => {
    // Messages clustered far below a high cursor — range query returns them.
    const all = makeMessages(10, 100);
    const { page, nextCursor } = paginateDmMessagesByCreatedAtDesc(all, {
      cursor: 10_000,
      limit: 5,
    });
    expect(page.length).toBe(5);
    expect(nextCursor).not.toBeNull();
    // Boundary: cursor equal to oldest createdAt → empty (exclusive)
    const atOldest = paginateDmMessagesByCreatedAtDesc(all, {
      cursor: all[all.length - 1]!.createdAt,
      limit: 5,
    });
    expect(atOldest.page.length).toBe(0);
    expect(atOldest.nextCursor).toBeNull();
  });

  it("does not fetch unbounded pages", () => {
    const all = makeMessages(200);
    const { page } = paginateDmMessagesByCreatedAtDesc(all, { limit: 999 });
    expect(page.length).toBe(50); // SOCIAL_DM_MESSAGE_PAGE_MAX
  });
});

describe("Phase 2E soft declineRequest", () => {
  it("exports declineRequest with flag + session wiring", () => {
    const block =
      dmSrc.match(/export const declineRequest = mutation\([\s\S]*?\n\}\);/)?.[0] ?? "";
    expect(block).toContain("assertGigaSocialDmEnabled()");
    expect(block).toContain("requireDmUserId");
    expect(block).toContain("assertCanDeclineDmRequest");
  });

  it("allows recipient decline; rejects initiator; idempotent when declined", () => {
    expect(
      assertCanDeclineDmRequest({
        requestStatus: "open",
        initiatedBy: "a@x.com",
        actorUserId: "b@x.com",
      })
    ).toEqual({ alreadyDeclined: false });
    expect(
      assertCanDeclineDmRequest({
        requestStatus: "declined",
        initiatedBy: "a@x.com",
        actorUserId: "b@x.com",
      })
    ).toEqual({ alreadyDeclined: true });
    expect(() =>
      assertCanDeclineDmRequest({
        requestStatus: "open",
        initiatedBy: "a@x.com",
        actorUserId: "a@x.com",
      })
    ).toThrow(ForbiddenError);
    expect(() =>
      assertCanDeclineDmRequest({
        requestStatus: "accepted",
        initiatedBy: "a@x.com",
        actorUserId: "b@x.com",
      })
    ).toThrow(/already accepted/);
  });

  it("forbids accept after decline", () => {
    expect(() =>
      assertCanAcceptDmRequest({
        requestStatus: "declined",
        initiatedBy: "a@x.com",
        actorUserId: "b@x.com",
      })
    ).toThrow(/declined/);
  });

  it("re-opens declined threads on send (soft decline recovery) unless blocked", () => {
    const send =
      dmSrc.match(/export const sendMessage = mutation\([\s\S]*?\n\}\);/)?.[0] ?? "";
    expect(send).toContain('requestStatus: "open"');
    expect(send).toContain("initiatedBy: userId");
    expect(send).toContain("assertPairNotBlocked");
  });
});

describe("Phase 2E authz + flag + notifications compatibility", () => {
  it("every functional handler asserts flag and session", () => {
    for (const name of [
      "listMyThreads",
      "listThreadMessages",
      "sendMessage",
      "acceptRequest",
      "declineRequest",
      "blockUser",
      "reportMessage",
    ]) {
      const block =
        dmSrc.match(
          new RegExp(`export const ${name} = (?:query|mutation)\\([\\s\\S]*?\\n\\}\\);`)
        )?.[0] ?? "";
      expect(block, name).toContain("assertGigaSocialDmEnabled()");
      expect(block, name).toMatch(/requireDmUserId|requireSession/);
    }
    expect(() => assertGigaSocialDmEnabled({})).toThrow(ForbiddenError);
  });

  it("status probe stays secret-free and notes hardening", () => {
    expect(dmSrc).toContain("hardening:");
    expect(dmSrc).toContain("blockHidesHistory: true");
    expect(dmSrc).not.toMatch(/GIGASOCIAL_DM_ENABLED.*return/);
    expect(dmSrc).toContain("Keep status free of env values / secrets");
  });

  it("does not alter notification APIs", () => {
    expect(gigaSocialSrc).toContain("export const listNotifications = query");
    expect(gigaSocialSrc).toContain("export const markNotificationsRead = mutation");
  });
});
