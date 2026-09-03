import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveHedgeDelayMs, runHedgedAttempts, type HedgeEvent } from "../../convex/chatHedging";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const attempt = (id: string, delayMs: number, fail = false) => ({
  id,
  run: async () => {
    await wait(delayMs);
    if (fail) throw new Error(`${id} failed`);
    return { content: `${id} answer` };
  },
});
const startedIds = (events: HedgeEvent[]) =>
  events.filter((e) => e.type === "start").map((e) => (e as { id: string }).id);

describe("runHedgedAttempts", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the primary when it answers before the hedge delay (no second call)", async () => {
    const events: HedgeEvent[] = [];
    const p = runHedgedAttempts([attempt("gemini", 2000), attempt("openai", 100)], {
      hedgeDelayMs: 8000,
      onEvent: (e) => events.push(e),
    });
    await vi.advanceTimersByTimeAsync(2500);
    const r = await p;
    expect(r?.id).toBe("gemini");
    expect(r?.hedged).toBe(false);
    expect(startedIds(events)).toEqual(["gemini"]);
  });

  it("starts the fallback after the hedge delay and takes the first success", async () => {
    const events: HedgeEvent[] = [];
    // Primary stalls (22s); fallback answers 1.5s after it is hedged in at 8s.
    const p = runHedgedAttempts([attempt("gemini", 22_000), attempt("openai", 1500)], {
      hedgeDelayMs: 8000,
      onEvent: (e) => events.push(e),
    });
    await vi.advanceTimersByTimeAsync(9600);
    const r = await p;
    expect(r?.id).toBe("openai");
    expect(r?.hedged).toBe(true);
    expect(startedIds(events)).toEqual(["gemini", "openai"]);
    const hedgedStart = events.find((e) => e.type === "start" && (e as { id: string }).id === "openai") as
      | { hedged: boolean }
      | undefined;
    expect(hedgedStart?.hedged).toBe(true);
  });

  it("falls through sequentially when attempts fail, and returns null if all fail", async () => {
    const p = runHedgedAttempts(
      [attempt("a", 100, true), attempt("b", 100, true), attempt("c", 100)],
      { hedgeDelayMs: 8000 }
    );
    await vi.advanceTimersByTimeAsync(1000);
    expect((await p)?.id).toBe("c");

    const q = runHedgedAttempts([attempt("a", 100, true), attempt("b", 100, true)], {
      hedgeDelayMs: 8000,
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(await q).toBeNull();
  });

  it("respects the total budget for non-primary attempts", async () => {
    const events: HedgeEvent[] = [];
    const p = runHedgedAttempts([attempt("a", 5000, true), attempt("b", 100)], {
      hedgeDelayMs: 0,
      budgetMs: 3000,
      onEvent: (e) => events.push(e),
    });
    await vi.advanceTimersByTimeAsync(6000);
    expect(await p).toBeNull();
    expect(events.some((e) => e.type === "budget_exhausted")).toBe(true);
  });

  it("hedgeDelayMs 0 disables hedging (pure sequential)", async () => {
    const events: HedgeEvent[] = [];
    const p = runHedgedAttempts([attempt("a", 3000), attempt("b", 100)], {
      hedgeDelayMs: 0,
      onEvent: (e) => events.push(e),
    });
    await vi.advanceTimersByTimeAsync(4000);
    expect((await p)?.id).toBe("a");
    expect(startedIds(events)).toEqual(["a"]);
  });

  it("reads CHAT_HEDGE_DELAY_MS with an 8s default", () => {
    expect(resolveHedgeDelayMs({})).toBe(8000);
    expect(resolveHedgeDelayMs({ CHAT_HEDGE_DELAY_MS: "5000" })).toBe(5000);
    expect(resolveHedgeDelayMs({ CHAT_HEDGE_DELAY_MS: "0" })).toBe(0);
    expect(resolveHedgeDelayMs({ CHAT_HEDGE_DELAY_MS: "nope" })).toBe(8000);
  });
});
