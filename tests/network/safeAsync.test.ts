import { describe, expect, it, vi } from "vitest";
import {
  createInFlightDeduper,
  isRetryableTransientError,
  TimeoutError,
  withSafeAsync,
} from "../../web/lib/network/safeAsync";

describe("safeAsync", () => {
  it("returns successful result without retry", async () => {
    const result = await withSafeAsync(async () => 42, { retries: 2 });
    expect(result).toBe(42);
  });

  it("retries transient failures then succeeds", async () => {
    let attempts = 0;
    const result = await withSafeAsync(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("Failed to fetch");
        return "ok";
      },
      { retries: 3, retryDelayMs: 1, timeoutMs: 5_000 }
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("throws TimeoutError when work exceeds timeout", async () => {
    await expect(
      withSafeAsync(
        async (signal) =>
          new Promise<never>((_resolve, reject) => {
            signal.addEventListener("abort", () => {
              reject(new TimeoutError());
            });
          }),
        { timeoutMs: 20, retries: 0 }
      )
    ).rejects.toBeInstanceOf(TimeoutError);
  });

  it("dedupes in-flight work by key", async () => {
    const dedupe = createInFlightDeduper<number>();
    let runs = 0;
    const a = dedupe.run("k", async () => {
      runs += 1;
      await new Promise((r) => setTimeout(r, 30));
      return 7;
    });
    const b = dedupe.run("k", async () => {
      runs += 1;
      return 9;
    });
    expect(await a).toBe(7);
    expect(await b).toBe(7);
    expect(runs).toBe(1);
  });

  it("classifies retryable errors", () => {
    expect(isRetryableTransientError(new Error("Failed to fetch"))).toBe(true);
    expect(isRetryableTransientError(new TimeoutError())).toBe(true);
    expect(isRetryableTransientError(new Error("Invalid credentials"))).toBe(false);
  });
});
