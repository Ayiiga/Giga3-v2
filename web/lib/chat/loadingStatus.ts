/**
 * Staged chat loading labels — replaces an endless single-line spinner with a
 * progressive status so the user always sees the request advancing and never a
 * frozen "Thinking…" with no context.
 *
 * Pure + framework-free so it can be unit tested and reused across hooks.
 */

export type ChatLoadingPhase = "sending" | "replying";

export type ChatLoadingStage = {
  /** Elapsed milliseconds at which this stage begins. */
  atMs: number;
  label: string;
};

/** Stages while the accept mutation is in flight (before server ack). */
export const CHAT_SENDING_STAGES: ChatLoadingStage[] = [
  { atMs: 0, label: "Connecting…" },
  { atMs: 1500, label: "Sending your message…" },
  { atMs: 4000, label: "Waiting for Giga3…" },
];

/** Shown only after the server accepted the message and AI work started. */
export const CHAT_REPLYING_LABEL = "Generating response…";

/** @deprecated use CHAT_SENDING_STAGES — kept for tests that reference all stages */
export const CHAT_LOADING_STAGES: ChatLoadingStage[] = [
  ...CHAT_SENDING_STAGES,
  { atMs: 9000, label: CHAT_REPLYING_LABEL },
];

/** Elapsed thresholds (ms) at which the visible label changes — used to schedule minimal re-renders. */
export const CHAT_LOADING_STAGE_BOUNDARIES: number[] = CHAT_SENDING_STAGES.slice(1).map(
  (stage) => stage.atMs
);

export const CHAT_REPLYING_STAGE_BOUNDARIES: number[] = [];

const SLOW_REPLY_SUFFIX = " (slow connection — this can take a minute)";
const SLOW_SEND_SUFFIX = " (slow connection — still sending…)";

function stageForElapsed(
  stages: ChatLoadingStage[],
  elapsedMs: number
): ChatLoadingStage {
  let active = stages[0];
  for (const stage of stages) {
    if (elapsedMs >= stage.atMs) {
      active = stage;
    } else {
      break;
    }
  }
  return active;
}

/** Returns the status label for the current elapsed wait time. */
export function chatLoadingStageLabel(
  elapsedMs: number,
  slowNetwork = false,
  phase: ChatLoadingPhase = "replying"
): string {
  if (phase === "replying") {
    return slowNetwork
      ? CHAT_REPLYING_LABEL + SLOW_REPLY_SUFFIX
      : CHAT_REPLYING_LABEL;
  }

  const active = stageForElapsed(CHAT_SENDING_STAGES, elapsedMs);
  const isLastSending = active === CHAT_SENDING_STAGES[CHAT_SENDING_STAGES.length - 1];
  if (slowNetwork && isLastSending) {
    return active.label + SLOW_SEND_SUFFIX;
  }
  return active.label;
}
