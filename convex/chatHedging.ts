/**
 * Hedged provider execution — pure, testable. Start the primary attempt; if it
 * has not resolved after `hedgeDelayMs`, start the next attempt in parallel and
 * take whichever succeeds first. Remaining attempts continue sequentially.
 *
 * This bounds tail latency: a stalled primary no longer costs the user a full
 * 22s timeout before the fallback even begins. The cost is an occasional
 * duplicate provider call on slow primaries (never a duplicate user charge).
 */

export type HedgeAttempt<T> = {
  id: string;
  run: () => Promise<T>;
};

export type HedgeEvent =
  | { type: "start"; id: string; hedged: boolean; at: number }
  | { type: "success"; id: string; latencyMs: number; at: number }
  | { type: "failure"; id: string; error: string; latencyMs: number; at: number }
  | { type: "budget_exhausted"; id: string; at: number };

export type HedgeOptions = {
  /** Delay before the second attempt is started while the first is still pending. 0 disables hedging. */
  hedgeDelayMs: number;
  /** Do not start new attempts (other than the primary) once this much time has elapsed. */
  budgetMs?: number;
  onEvent?: (event: HedgeEvent) => void;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

export type HedgeResult<T> = { value: T; id: string; latencyMs: number; hedged: boolean };

export function resolveHedgeDelayMs(env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env.CHAT_HEDGE_DELAY_MS);
  if (Number.isFinite(raw) && raw >= 0) return raw;
  return 8_000;
}

/**
 * Returns the first successful result, or null when every attempt failed.
 * Attempt order is preserved as priority; a hedged secondary only wins if the
 * primary has not already succeeded.
 */
export async function runHedgedAttempts<T>(
  attempts: HedgeAttempt<T>[],
  options: HedgeOptions
): Promise<HedgeResult<T> | null> {
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const started = now();
  const budgetMs = options.budgetMs ?? Number.POSITIVE_INFINITY;
  const emit = (event: HedgeEvent) => options.onEvent?.(event);

  type Settled = { ok: true; value: T; id: string; startedAt: number } | { ok: false; id: string; startedAt: number; error: string };

  const inFlight = new Map<string, Promise<Settled>>();
  let nextIndex = 0;

  const launch = (hedged: boolean): boolean => {
    const attempt = attempts[nextIndex];
    if (!attempt) return false;
    if (nextIndex > 0 && Number.isFinite(budgetMs) && now() - started >= budgetMs) {
      emit({ type: "budget_exhausted", id: attempt.id, at: now() });
      nextIndex = attempts.length;
      return false;
    }
    nextIndex += 1;
    const startedAt = now();
    emit({ type: "start", id: attempt.id, hedged, at: startedAt });
    const settled: Promise<Settled> = attempt
      .run()
      .then((value) => ({ ok: true as const, value, id: attempt.id, startedAt }))
      .catch((err: unknown) => ({
        ok: false as const,
        id: attempt.id,
        startedAt,
        error: err instanceof Error ? err.message : String(err),
      }));
    inFlight.set(attempt.id, settled);
    return true;
  };

  if (!launch(false)) return null;

  const HEDGE = Symbol("hedge");
  let hedgeArmed = options.hedgeDelayMs > 0 && attempts.length > 1;

  while (inFlight.size > 0) {
    const racers: Promise<Settled | typeof HEDGE>[] = [...inFlight.values()];
    if (hedgeArmed) {
      racers.push(sleep(options.hedgeDelayMs).then(() => HEDGE));
    }
    const outcome = await Promise.race(racers);

    if (outcome === HEDGE) {
      // Primary still pending after the hedge delay: start the next candidate alongside it.
      hedgeArmed = false;
      launch(true);
      continue;
    }

    inFlight.delete(outcome.id);
    const latencyMs = now() - outcome.startedAt;
    if (outcome.ok) {
      emit({ type: "success", id: outcome.id, latencyMs, at: now() });
      return {
        value: outcome.value,
        id: outcome.id,
        latencyMs,
        hedged: outcome.id !== attempts[0]?.id,
      };
    }
    emit({ type: "failure", id: outcome.id, error: outcome.error, latencyMs, at: now() });
    if (inFlight.size === 0) {
      // Nothing else running — fall back to sequential for the rest of the list.
      hedgeArmed = false;
      if (!launch(false)) return null;
    }
  }
  return null;
}
