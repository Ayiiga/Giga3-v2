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

/** Stages after the server accepted the message and AI work started. */
export const CHAT_REPLYING_STAGES: ChatLoadingStage[] = [
  { atMs: 0, label: "Generating response…" },
  { atMs: 12_000, label: "Still working on it…" },
  { atMs: 30_000, label: "Taking a bit longer…" },
  { atMs: 60_000, label: "Almost there…" },
];

/** Shown only after the server accepted the message and AI work started. */
export const CHAT_REPLYING_LABEL = CHAT_REPLYING_STAGES[0].label;

/** @deprecated use CHAT_SENDING_STAGES — kept for tests that reference all stages */
export const CHAT_LOADING_STAGES: ChatLoadingStage[] = [
  ...CHAT_SENDING_STAGES,
  ...CHAT_REPLYING_STAGES.slice(1),
];

/** Elapsed thresholds (ms) at which the visible label changes — used to schedule minimal re-renders. */
export const CHAT_LOADING_STAGE_BOUNDARIES: number[] = CHAT_SENDING_STAGES.slice(1).map(
  (stage) => stage.atMs
);

export const CHAT_REPLYING_STAGE_BOUNDARIES: number[] = CHAT_REPLYING_STAGES.slice(1).map(
  (stage) => stage.atMs
);

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
  _slowNetwork = false,
  phase: ChatLoadingPhase = "replying"
): string {
  const stages = phase === "replying" ? CHAT_REPLYING_STAGES : CHAT_SENDING_STAGES;
  return stageForElapsed(stages, elapsedMs).label;
}
