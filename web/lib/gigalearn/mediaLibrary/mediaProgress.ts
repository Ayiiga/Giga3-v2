/**
 * Local media activity progress for Discover (view / hear / game).
 * Queues assessment-shaped events so the existing offline sync path can flush them.
 */

import {
  newOfflineProgressEventId,
  queueOfflineAssessmentEvent,
} from "@/lib/gigalearn/offlineProgressQueue";
import type { MediaProgressEvent } from "@/lib/gigalearn/mediaLibrary/types";

const LOCAL_KEY = "giga3_gigalearn_media_progress";

function readLocal(): MediaProgressEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MediaProgressEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: MediaProgressEvent[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows.slice(-200)));
  } catch {
    // Quota — keep going without local history.
  }
}

export function listLocalMediaProgress(itemId?: string): MediaProgressEvent[] {
  const rows = readLocal();
  return itemId ? rows.filter((row) => row.itemId === itemId) : rows;
}

export async function recordMediaProgress(input: {
  itemId: string;
  kind: MediaProgressEvent["kind"];
  score?: number;
  subject?: string;
  curriculum?: string;
  countryId?: string;
}): Promise<MediaProgressEvent> {
  const event: MediaProgressEvent = {
    clientEventId: newOfflineProgressEventId(),
    itemId: input.itemId,
    kind: input.kind,
    score: input.score,
    countryId: input.countryId,
    createdAt: Date.now(),
  };
  const rows = readLocal();
  rows.push(event);
  writeLocal(rows);

  // Map game completions into the existing assessment sync queue.
  if (input.kind === "game_completed" && typeof input.score === "number") {
    const countryPrefix = input.countryId ? `${input.countryId}:` : "";
    await queueOfflineAssessmentEvent({
      clientEventId: event.clientEventId,
      topicKey: `media:${countryPrefix}${input.itemId}`,
      subject: input.subject,
      curriculum: input.curriculum,
      score: input.score,
      toolId: "discover-media",
    });
  }

  return event;
}

export function hasCompletedGame(itemId: string): boolean {
  return listLocalMediaProgress(itemId).some((row) => row.kind === "game_completed");
}
