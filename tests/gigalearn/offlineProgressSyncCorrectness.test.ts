import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isOfflineAssessmentStale } from "../../web/lib/gigalearn/offlineProgressMerge";
import {
  bumpOfflineProgressAttempt,
  listOfflineProgressEvents,
  newOfflineProgressEventId,
  queueOfflineAssessmentEvent,
} from "../../web/lib/gigalearn/offlineProgressQueue";
import {
  flushOfflineProgressQueue,
  MAX_OFFLINE_PROGRESS_SYNC_ATTEMPTS,
} from "../../web/lib/gigalearn/offlineProgressSync";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

const hasIndexedDb = typeof indexedDB !== "undefined";

const T1 = 1_000;
const T2 = 2_000;
const T3 = 3_000;

describe("GigaLearn offline progress merge (server-side logic)", () => {
  it("Test 1 — stale offline event: server newer progress is preserved", () => {
    expect(isOfflineAssessmentStale({ updatedAt: T2, lastAssessedAt: T2 }, T1)).toBe(true);
  });

  it("Test 2 — offline event newer than server: should apply", () => {
    expect(
      isOfflineAssessmentStale({ updatedAt: T1, lastAssessedAt: T1 }, T2)
    ).toBe(false);
  });

  it("recordAssessment uses monotonic merge and optional clientCreatedAt", () => {
    const src = read("convex/gigaLearnProgress.ts");
    expect(src).toContain("clientCreatedAt: v.optional(v.number())");
    expect(src).toContain("isOfflineAssessmentStale");
    expect(src).toContain("requireSession(args.sessionToken, ctx)");
    expect(src).toContain('.eq("userId", email)');
  });

  it("Test 9 — authorization: recordAssessment scoped to session user", () => {
    const src = read("convex/gigaLearnProgress.ts");
    const start = src.indexOf("export const recordAssessment");
    const end = src.indexOf("export const recordPractice");
    const block = src.slice(start, end);
    expect(block).toContain("requireSession(args.sessionToken, ctx)");
    expect(block).toContain('q.eq("userId", email)');
    expect(block).not.toContain("args.userId");
  });
});

describe.skipIf(!hasIndexedDb)("GigaLearn offline progress queue correctness", () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase("giga3-gigalearn-offline");
    await new Promise((r) => setTimeout(r, 20));
  });

  it("Test 3 — multiple offline events flush in chronological order", async () => {
    const ids = [newOfflineProgressEventId(), newOfflineProgressEventId(), newOfflineProgressEventId()];
    await queueOfflineAssessmentEvent({
      clientEventId: ids[0],
      topicKey: "math/fractions",
      score: 50,
      createdAt: T1,
    });
    await queueOfflineAssessmentEvent({
      clientEventId: ids[1],
      topicKey: "math/fractions",
      score: 65,
      createdAt: T2,
    });
    await queueOfflineAssessmentEvent({
      clientEventId: ids[2],
      topicKey: "math/fractions",
      score: 80,
      createdAt: T3,
    });

    let serverUpdatedAt = 0;
    let serverScore = 0;
    const appliedScores: number[] = [];

    await flushOfflineProgressQueue(async (event) => {
      if (!isOfflineAssessmentStale({ updatedAt: serverUpdatedAt, lastAssessedAt: serverUpdatedAt }, event.createdAt)) {
        serverScore = event.score;
        serverUpdatedAt = event.createdAt;
        appliedScores.push(event.score);
      }
    });

    expect(appliedScores).toEqual([50, 65, 80]);
    expect(serverScore).toBe(80);
    expect(await listOfflineProgressEvents()).toHaveLength(0);
  });

  it("Test 4 — duplicate queue ID keeps only one record", async () => {
    const clientEventId = newOfflineProgressEventId();
    await queueOfflineAssessmentEvent({
      clientEventId,
      topicKey: "science",
      score: 70,
    });
    await queueOfflineAssessmentEvent({
      clientEventId,
      topicKey: "science",
      score: 99,
    });
    expect(await listOfflineProgressEvents()).toHaveLength(1);
    expect((await listOfflineProgressEvents())[0]?.score).toBe(70);
  });

  it("Test 5 — bumpOfflineProgressAttempt increments attempts", async () => {
    const clientEventId = newOfflineProgressEventId();
    await queueOfflineAssessmentEvent({
      clientEventId,
      topicKey: "english",
      score: 60,
    });

    await bumpOfflineProgressAttempt(clientEventId, "network down");
    expect((await listOfflineProgressEvents())[0]?.attempts).toBe(1);

    await bumpOfflineProgressAttempt(clientEventId, "still down");
    expect((await listOfflineProgressEvents())[0]?.attempts).toBe(2);
  });

  it("Test 6 — retry failure keeps event queued and increments attempts", async () => {
    const clientEventId = newOfflineProgressEventId();
    await queueOfflineAssessmentEvent({
      clientEventId,
      topicKey: "history",
      score: 72,
    });

    const result = await flushOfflineProgressQueue(async () => {
      throw new Error("temporary outage");
    });

    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(1);
    expect(result.deadLettered).toBe(0);
    const row = (await listOfflineProgressEvents())[0];
    expect(row?.attempts).toBe(1);
    expect(row?.lastError).toBe("temporary outage");
  });

  it("Test 7 — max attempts removes permanently pending events", async () => {
    const clientEventId = newOfflineProgressEventId();
    await queueOfflineAssessmentEvent({
      clientEventId,
      topicKey: "geography",
      score: 55,
      attempts: MAX_OFFLINE_PROGRESS_SYNC_ATTEMPTS,
    });

    const result = await flushOfflineProgressQueue(async () => {
      throw new Error("should not run");
    });

    expect(result.deadLettered).toBe(1);
    expect(result.remaining).toBe(0);
    expect(await listOfflineProgressEvents()).toHaveLength(0);
  });

  it("Test 8 — stale reconciliation removes event without retry attempts", async () => {
    const clientEventId = newOfflineProgressEventId();
    await queueOfflineAssessmentEvent({
      clientEventId,
      topicKey: "math/algebra",
      score: 55,
      createdAt: T1,
      attempts: 0,
    });

    const serverUpdatedAt = T2;
    const serverScore = 88;

    const result = await flushOfflineProgressQueue(async (event) => {
      if (
        isOfflineAssessmentStale(
          { updatedAt: serverUpdatedAt, lastAssessedAt: serverUpdatedAt },
          event.createdAt
        )
      ) {
        return;
      }
      throw new Error("should not apply stale event");
    });

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.deadLettered).toBe(0);
    expect(await listOfflineProgressEvents()).toHaveLength(0);
    expect(serverScore).toBe(88);
  });
});
