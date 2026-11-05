/**
 * @vitest-environment edge-runtime
 * Free OpenAI quota reservation lifecycle: reserve, commit, release and replay.
 */
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { internal } from "../../convex/_generated/api";

const modules = import.meta.glob("../../convex/**/*.*s");

describe("free OpenAI quota reservations", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("releases quota after provider failure so the next request can reserve it", async () => {
    const t = convexTest(schema, modules);
    for (let i = 0; i < 5; i++) {
      const result = await t.mutation(internal.freeOpenAiQuota.tryReserveInternal, {
        userId: "fairness@example.com",
        requestId: "provider-attempt-" + i,
      });
      expect(result.ok).toBe(true);
      await t.mutation(internal.freeOpenAiQuota.commitReservationInternal, {
        userId: "fairness@example.com",
        requestId: "provider-attempt-" + i,
      });
    }
    const blocked = await t.mutation(internal.freeOpenAiQuota.tryReserveInternal, {
      userId: "fairness@example.com", requestId: "sixth-attempt",
    });
    expect(blocked.ok).toBe(false);
    const released = await t.mutation(internal.freeOpenAiQuota.tryReserveInternal, {
      userId: "release-user@example.com", requestId: "failed-provider-job",
    });
    expect(released.ok).toBe(true);
    await t.mutation(internal.freeOpenAiQuota.releaseReservationInternal, {
      userId: "release-user@example.com", requestId: "failed-provider-job",
    });
    const retry = await t.mutation(internal.freeOpenAiQuota.tryReserveInternal, {
      userId: "release-user@example.com", requestId: "provider-retry-job",
    });
    expect(retry.ok).toBe(true);
    expect(retry.snapshot.remaining).toBe(4);
  });

  it("commits a reservation exactly once, including duplicate commit calls", async () => {
    const t = convexTest(schema, modules);
    const args = { userId: "commit@example.com", requestId: "job-commit-1" };
    const reserved = await t.mutation(internal.freeOpenAiQuota.tryReserveInternal, args);
    expect(reserved.ok).toBe(true);
    await t.mutation(internal.freeOpenAiQuota.commitReservationInternal, args);
    await t.mutation(internal.freeOpenAiQuota.commitReservationInternal, args);
    const snapshot = await t.query(internal.freeOpenAiQuota.getSnapshotInternal, {
      userId: args.userId,
    });
    expect(snapshot.remaining).toBe(4);
  });

  it("releases a reservation exactly once and rejects cross-user replay", async () => {
    const t = convexTest(schema, modules);
    const args = { userId: "release@example.com", requestId: "job-release-1" };
    await t.mutation(internal.freeOpenAiQuota.tryReserveInternal, args);
    await t.mutation(internal.freeOpenAiQuota.releaseReservationInternal, args);
    await t.mutation(internal.freeOpenAiQuota.releaseReservationInternal, args);
    const snapshot = await t.query(internal.freeOpenAiQuota.getSnapshotInternal, {
      userId: args.userId,
    });
    expect(snapshot.remaining).toBe(5);
    await expect(t.mutation(internal.freeOpenAiQuota.tryReserveInternal, {
      userId: "attacker@example.com", requestId: args.requestId,
    })).rejects.toThrow("Quota reservation request ID belongs to another user");
  });

  it("does not let a duplicate reservation consume a second slot", async () => {
    const t = convexTest(schema, modules);
    const args = { userId: "replay@example.com", requestId: "same-job-id" };
    const first = await t.mutation(internal.freeOpenAiQuota.tryReserveInternal, args);
    const replay = await t.mutation(internal.freeOpenAiQuota.tryReserveInternal, args);
    expect(first.ok).toBe(true);
    expect(replay.ok).toBe(true);
    expect(replay.alreadyReserved).toBe(true);
    expect(replay.snapshot.remaining).toBe(4);
  });
});
