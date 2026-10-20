import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  encodeDmMessageCursor,
  isDmMessageOlderThanCursor,
  paginateDmMessagesByCreatedAtDesc,
  paginateDmThreadsByUpdatedAtDesc,
  parseDmMessageCursor,
} from "../../convex/gigaSocialDmPolicy";

const dmSrc = readFileSync(
  resolve(__dirname, "../../convex/gigaSocialDm.ts"),
  "utf8"
);

function collectAll(
  newestFirst: Array<{ messageId: string; createdAt: number }>,
  limit: number
) {
  const seen = new Set<string>();
  let cursor: string | undefined;
  let pages = 0;
  const pageSizes: number[] = [];
  for (let guard = 0; guard < 100; guard++) {
    const { page, nextCursor } = paginateDmMessagesByCreatedAtDesc(newestFirst, {
      cursor,
      limit,
    });
    pages += 1;
    pageSizes.push(page.length);
    for (const m of page) {
      if (seen.has(m.messageId)) {
        return {
          pages,
          collected: seen.size,
          missing: [] as string[],
          duplicates: true,
          pageSizes,
        };
      }
      seen.add(m.messageId);
    }
    if (nextCursor == null) break;
    cursor = nextCursor;
  }
  const missing = newestFirst
    .map((m) => m.messageId)
    .filter((id) => !seen.has(id));
  return {
    pages,
    collected: seen.size,
    expected: newestFirst.length,
    missing,
    duplicates: false,
    pageSizes,
  };
}

function sortNewestFirst(
  rows: Array<{ messageId: string; createdAt: number }>
) {
  return [...rows].sort(
    (a, b) =>
      b.createdAt - a.createdAt ||
      (a.messageId < b.messageId ? 1 : a.messageId > b.messageId ? -1 : 0)
  );
}

describe("DM compound message cursor", () => {
  it("encodes/parses compound and legacy numeric cursors", () => {
    expect(encodeDmMessageCursor({ createdAt: 10, messageId: "abc" })).toBe(
      "10:abc"
    );
    expect(parseDmMessageCursor("10:abc")).toEqual({
      createdAt: 10,
      messageId: "abc",
    });
    expect(parseDmMessageCursor(42)).toEqual({ createdAt: 42, messageId: "" });
    expect(parseDmMessageCursor("99")).toEqual({ createdAt: 99, messageId: "" });
  });

  it("tie-breaks same createdAt by messageId", () => {
    const cursor = { createdAt: 5, messageId: "m5" };
    expect(
      isDmMessageOlderThanCursor({ messageId: "m4", createdAt: 5 }, cursor)
    ).toBe(true);
    expect(
      isDmMessageOlderThanCursor({ messageId: "m6", createdAt: 5 }, cursor)
    ).toBe(false);
    expect(
      isDmMessageOlderThanCursor({ messageId: "m9", createdAt: 4 }, cursor)
    ).toBe(true);
  });

  it("1) 60 unique timestamps: full traversal, no dups/skips", () => {
    const all = sortNewestFirst(
      Array.from({ length: 60 }, (_, i) => ({
        messageId: `u${String(i).padStart(3, "0")}`,
        createdAt: 1000 + i,
      }))
    );
    const r = collectAll(all, 20);
    expect(r.duplicates).toBe(false);
    expect(r.missing).toEqual([]);
    expect(r.collected).toBe(60);
    expect(r.pages).toBe(3);
  });

  it("2) 60 messages with repeated timestamps: full traversal", () => {
    const rows: Array<{ messageId: string; createdAt: number }> = [];
    for (let t = 0; t < 10; t++) {
      for (let k = 0; k < 6; k++) {
        rows.push({
          messageId: `t${t}_k${k}`,
          createdAt: 5000 + t,
        });
      }
    }
    const r = collectAll(sortNewestFirst(rows), 10);
    expect(r.duplicates).toBe(false);
    expect(r.missing).toEqual([]);
    expect(r.collected).toBe(60);
  });

  it("3) 25 messages sharing one timestamp: full traversal", () => {
    const all = sortNewestFirst(
      Array.from({ length: 25 }, (_, i) => ({
        messageId: `m${String(i).padStart(2, "0")}`,
        createdAt: 9000,
      }))
    );
    const r = collectAll(all, 10);
    expect(r.duplicates).toBe(false);
    expect(r.missing).toEqual([]);
    expect(r.collected).toBe(25);
    expect(r.pages).toBe(3);
  });

  it("4) mixed timestamps at page boundaries", () => {
    const rows: Array<{ messageId: string; createdAt: number }> = [];
    for (let i = 0; i <= 40; i++) {
      const createdAt = i >= 20 && i <= 29 ? 2000 : 1000 + i;
      rows.push({ messageId: `x${String(i).padStart(2, "0")}`, createdAt });
    }
    const r = collectAll(sortNewestFirst(rows), 8);
    expect(r.duplicates).toBe(false);
    expect(r.missing).toEqual([]);
    expect(r.collected).toBe(41);
  });

  it("5) final-page and empty-page behavior", () => {
    const all = sortNewestFirst(
      Array.from({ length: 5 }, (_, i) => ({
        messageId: `f${i}`,
        createdAt: i,
      }))
    );
    const first = paginateDmMessagesByCreatedAtDesc(all, { limit: 10 });
    expect(first.page.length).toBe(5);
    expect(first.nextCursor).toBeNull();

    const empty = paginateDmMessagesByCreatedAtDesc(all, {
      cursor: encodeDmMessageCursor({ createdAt: 0, messageId: "f0" }),
      limit: 10,
    });
    expect(empty.page.length).toBe(0);
    expect(empty.nextCursor).toBeNull();
  });

  it("6) complete traversal without duplicates or missing messages", () => {
    const rows: Array<{ messageId: string; createdAt: number }> = [];
    for (let i = 0; i < 100; i++) {
      rows.push({
        messageId: `z${String(i).padStart(3, "0")}`,
        createdAt: 7000 + Math.floor(i / 3),
      });
    }
    const r = collectAll(sortNewestFirst(rows), 17);
    expect(r.duplicates).toBe(false);
    expect(r.missing).toEqual([]);
    expect(r.collected).toBe(100);
  });

  it("wires compound cursor in listThreadMessages", () => {
    const block =
      dmSrc.match(/export const listThreadMessages = query\([\s\S]*?\n\}\);/)?.[0] ??
      "";
    expect(block).toContain("parseDmMessageCursor");
    expect(block).toContain("encodeDmMessageCursor");
    expect(block).toContain("isDmMessageOlderThanCursor");
    expect(block).toContain('v.union(v.string(), v.number())');
  });
});

describe("DM thread list pagination with blocks", () => {
  it("continues past blocked threads without false EOF", () => {
    // 30 newest blocked, then 15 visible
    const rows = Array.from({ length: 45 }, (_, i) => ({
      threadId: `t${String(44 - i).padStart(2, "0")}`,
      updatedAt: 1000 + (44 - i),
      blocked: 44 - i >= 15,
    }));
    const visibleOnly = rows.filter((r) => !r.blocked);
    // Simulate first page limit 10 after block filter from a scan that includes blocked
    const first = paginateDmThreadsByUpdatedAtDesc(visibleOnly, {
      limit: 10,
      scanHitCap: true,
    });
    expect(first.page.length).toBe(10);
    expect(first.nextCursor).not.toBeNull();

    const second = paginateDmThreadsByUpdatedAtDesc(visibleOnly, {
      limit: 10,
      cursor: {
        updatedAt: first.page[first.page.length - 1]!.updatedAt,
        threadId: first.page[first.page.length - 1]!.threadId,
      },
      scanHitCap: false,
    });
    expect(second.page.length).toBe(5);
    const ids = [...first.page, ...second.page].map((t) => t.threadId);
    expect(new Set(ids).size).toBe(15);
  });

  it("listMyThreads uses scan cap + thread cursor", () => {
    const block =
      dmSrc.match(/export const listMyThreads = query\([\s\S]*?\n\}\);/)?.[0] ?? "";
    expect(block).toContain("SOCIAL_DM_THREAD_SCAN_MAX");
    expect(block).toContain("parseDmThreadCursor");
    expect(block).toContain("encodeDmThreadCursor");
    expect(block).toContain("shouldHideDmThreadForBlock");
  });
});
