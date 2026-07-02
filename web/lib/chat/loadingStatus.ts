/**
 * Staged chat loading labels — replaces an endless single-line spinner with a
 * progressive status so the user always sees the request advancing and never a
 * frozen "Thinking…" with no context.
 *
 * Pure + framework-free so it can be unit tested and reused across hooks.
 */

export type ChatLoadingStage = {
  /** Elapsed milliseconds at which this stage begins. */
  atMs: number;
  label: string;
};

/** Ordered stages. Each becomes active once elapsed >= atMs. */
export const CHAT_LOADING_STAGES: ChatLoadingStage[] = [
  { atMs: 0, label: "Connecting…" },
  { atMs: 1500, label: "Sending your message…" },
  { atMs: 4000, label: "Waiting for Giga3…" },
  { atMs: 9000, label: "Generating response…" },
];

/** Elapsed thresholds (ms) at which the visible label changes — used to schedule minimal re-renders. */
export const CHAT_LOADING_STAGE_BOUNDARIES: number[] = CHAT_LOADING_STAGES.slice(1).map(
  (stage) => stage.atMs
);

const SLOW_SUFFIX = " (slow connection — this can take a minute)";

/** Returns the status label for the current elapsed wait time. */
export function chatLoadingStageLabel(
  elapsedMs: number,
  slowNetwork = false
): string {
  let active = CHAT_LOADING_STAGES[0];
  for (const stage of CHAT_LOADING_STAGES) {
    if (elapsedMs >= stage.atMs) {
      active = stage;
    } else {
      break;
    }
  }
  const isFinalStage = active === CHAT_LOADING_STAGES[CHAT_LOADING_STAGES.length - 1];
  if (slowNetwork && isFinalStage) {
    return active.label + SLOW_SUFFIX;
  }
  return active.label;
}
