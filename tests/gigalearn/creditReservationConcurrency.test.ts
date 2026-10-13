import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CREDIT_RESERVATION_STALE_MS,
  InMemoryCreditLedger,
  decideCapture,
  decideRelease,
  decideReserve,
  simulateConcurrentReserves,
} from "../../convex/creditReservationLogic";
import { CREDIT_COSTS } from "../../convex/creditsConfig";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("credit reservation concurrency (deterministic ledger)", () => {
  const now = 1_700_000_000_000;
  const amount = CREDIT_COSTS.writing;

  it("1. two concurrent requests cannot both reserve when balance covers only one", () => {
    const { first, second, balance } = simulateConcurrentReserves({
      balance: amount,
      amount,
      requestIds: ["req-a", "req-b"],
      now,
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("insufficient");
    expect(balance).toBe(0);
  });

  it("2. same idempotency key rejects in-progress duplicate", () => {
    const ledger = new InMemoryCreditLedger(10);
    const first = ledger.reserve({
      userId: "u",
      requestId: "same",
      action: "writing",
      amount,
      now,
    });
    const second = ledger.reserve({
      userId: "u",
      requestId: "same",
      action: "writing",
      amount,
      now: now + 1000,
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("in_progress");
    expect(ledger.balance).toBe(10 - amount);
  });

  it("3. distinct legitimate requests both reserve when balance allows", () => {
    const { first, second, balance } = simulateConcurrentReserves({
      balance: amount * 2,
      amount,
      requestIds: ["req-1", "req-2"],
      now,
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(balance).toBe(0);
  });

  it("4. duplicate UI submission (same key) does not double-charge", () => {
    const ledger = new InMemoryCreditLedger(20);
    ledger.reserve({ userId: "u", requestId: "ui-1", action: "writing", amount, now });
    ledger.reserve({ userId: "u", requestId: "ui-1", action: "writing", amount, now: now + 50 });
    expect(ledger.balance).toBe(20 - amount);
    expect(ledger.logs.filter((l) => l.amount < 0)).toHaveLength(1);
  });

  it("5. provider failure releases reservation (refund)", () => {
    const ledger = new InMemoryCreditLedger(10);
    ledger.reserve({ userId: "u", requestId: "fail-1", action: "writing", amount, now });
    expect(ledger.balance).toBe(10 - amount);
    const released = ledger.release({ requestId: "fail-1", now: now + 10 });
    expect(released.ok).toBe(true);
    expect(ledger.balance).toBe(10);
    expect(ledger.reservations.get("fail-1")?.status).toBe("released");
  });

  it("6. ambiguous timeout: retry same key stays in_progress; stale recovery refunds then allows new reserve", () => {
    const ledger = new InMemoryCreditLedger(10);
    ledger.reserve({ userId: "u", requestId: "amb", action: "writing", amount, now });
    const quickRetry = ledger.reserve({
      userId: "u",
      requestId: "amb",
      action: "writing",
      amount,
      now: now + 60_000,
    });
    expect(quickRetry.ok).toBe(false);
    if (!quickRetry.ok) expect(quickRetry.reason).toBe("in_progress");

    const staleRetry = ledger.reserve({
      userId: "u",
      requestId: "amb",
      action: "writing",
      amount,
      now: now + CREDIT_RESERVATION_STALE_MS + 1,
      staleMs: CREDIT_RESERVATION_STALE_MS,
    });
    expect(staleRetry.ok).toBe(true);
    expect(ledger.balance).toBe(10 - amount);
  });

  it("7. interrupted reservation recovery via release then new request", () => {
    const ledger = new InMemoryCreditLedger(6);
    ledger.reserve({ userId: "u", requestId: "old", action: "writing", amount, now });
    ledger.release({ requestId: "old", now: now + 5 });
    const next = ledger.reserve({
      userId: "u",
      requestId: "new",
      action: "writing",
      amount,
      now: now + 6,
    });
    expect(next.ok).toBe(true);
    expect(ledger.balance).toBe(6 - amount);
  });

  it("8. successful generation captures without second charge", () => {
    const ledger = new InMemoryCreditLedger(10);
    ledger.reserve({ userId: "u", requestId: "ok", action: "writing", amount, now });
    const before = ledger.balance;
    expect(ledger.capture({ requestId: "ok", now: now + 1 }).ok).toBe(true);
    expect(ledger.balance).toBe(before);
    expect(ledger.reservations.get("ok")?.status).toBe("captured");
    // Capture is idempotent; release after capture must fail.
    expect(ledger.release({ requestId: "ok", now: now + 2 }).ok).toBe(false);
  });

  it("9. retry after completed request is rejected without another charge", () => {
    const ledger = new InMemoryCreditLedger(10);
    ledger.reserve({ userId: "u", requestId: "done", action: "writing", amount, now });
    ledger.capture({ requestId: "done", now: now + 1 });
    const retry = ledger.reserve({
      userId: "u",
      requestId: "done",
      action: "writing",
      amount,
      now: now + 2,
    });
    expect(retry.ok).toBe(false);
    if (!retry.ok) expect(retry.reason).toBe("already_completed");
    expect(ledger.balance).toBe(10 - amount);
  });

  it("10. insufficient-credit rejection leaves balance unchanged", () => {
    const decision = decideReserve({
      existing: null,
      balance: 1,
      amount: 2,
      now,
    });
    expect(decision.kind).toBe("reject_insufficient");
    const ledger = new InMemoryCreditLedger(1);
    const result = ledger.reserve({
      userId: "u",
      requestId: "poor",
      action: "writing",
      amount: 2,
      now,
    });
    expect(result.ok).toBe(false);
    expect(ledger.balance).toBe(1);
    expect(ledger.reservations.size).toBe(0);
  });

  it("finalize helpers are idempotent for capture/release", () => {
    const reserved = {
      requestId: "r",
      userId: "u",
      action: "writing",
      amount: 2,
      status: "reserved" as const,
      createdAt: now,
      updatedAt: now,
    };
    expect(decideCapture(reserved).kind).toBe("capture");
    expect(decideRelease(reserved).kind).toBe("release");
    expect(decideCapture({ ...reserved, status: "captured" }).kind).toBe("noop_already_captured");
    expect(decideRelease({ ...reserved, status: "released" }).kind).toBe("noop_already_released");
  });
});

describe("gigalearnStudio reserve-before-generate wiring", () => {
  it("reserves before provider call and captures or releases afterward", () => {
    const src = read("convex/gigalearnStudio.ts");
    const handler = src.slice(src.indexOf("export const generateContent = action"));
    const reserveIdx = handler.indexOf("internal.creditReservations.tryReserveInternal");
    const providerIdx = handler.indexOf("completeChatWithFailover");
    const captureIdx = handler.indexOf("internal.creditReservations.captureInternal");
    const releaseIdx = handler.indexOf("internal.creditReservations.releaseInternal");
    expect(reserveIdx).toBeGreaterThan(-1);
    expect(providerIdx).toBeGreaterThan(reserveIdx);
    expect(captureIdx).toBeGreaterThan(providerIdx);
    expect(releaseIdx).toBeGreaterThan(reserveIdx);
    expect(handler).toContain("clientRequestId");
    expect(handler).toContain('providerId === "local_fallback"');
    // Post-success deductCredits path must be gone for this action.
    expect(handler).not.toContain("api.credits.deductCredits");
  });

  it("schema defines creditReservations with user+request uniqueness index", () => {
    const schema = read("convex/schema.ts");
    expect(schema).toContain("creditReservations: defineTable");
    expect(schema).toContain('.index("by_user_request", ["userId", "requestId"])');
  });

  it("client generation hook sends clientRequestId", () => {
    const hook = read("web/hooks/useCreationGeneration.ts");
    expect(hook).toContain("clientRequestId");
    expect(hook).toMatch(/randomUUID|web_/);
  });
});
