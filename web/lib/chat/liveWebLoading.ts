/** Live web progress labels for typing indicator. */

import { chatLoadingStageLabel } from "@/lib/chat/loadingStatus";
import type { LiveWebProgressStage } from "@/lib/chat/liveWebTypes";

export const LIVE_WEB_PROGRESS_LABELS: Record<LiveWebProgressStage, string> = {
  searching: "Searching…",
  opening_source: "Opening source…",
  reading: "Reading…",
  comparing: "Comparing sources…",
  preparing_answer: "Preparing answer…",
};

export function liveWebProgressLabel(stage: string | null | undefined): string | null {
  if (!stage) return null;
  return LIVE_WEB_PROGRESS_LABELS[stage as LiveWebProgressStage] ?? null;
}

export function chatLoadingStageLabelWithLiveWeb(
  elapsedMs: number,
  phase: "sending" | "replying",
  liveWebProgress?: string | null,
  slowNetwork = false
): string {
  const liveLabel = liveWebProgressLabel(liveWebProgress);
  if (phase === "replying" && liveLabel) return liveLabel;
  return chatLoadingStageLabel(elapsedMs, slowNetwork, phase);
}
