import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getOfflineLesson,
  listOfflineLessons,
  saveOfflineLesson,
} from "../../web/lib/gigalearn/offlineLessons";
import {
  listOfflineProgressEvents,
  newOfflineProgressEventId,
  queueOfflineAssessmentEvent,
  removeOfflineProgressEvent,
} from "../../web/lib/gigalearn/offlineProgressQueue";
import { flushOfflineProgressQueue } from "../../web/lib/gigalearn/offlineProgressSync";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

const hasIndexedDb = typeof indexedDB !== "undefined";

describe("GigaLearn offline remediation wiring", () => {
  it("wires offline lesson reopen UI and progress queue in components", () => {
    expect(read("web/components/gigalearn/OfflineLessonsPanel.tsx")).toContain("getOfflineLesson");
    expect(read("web/components/gigalearn/OfflineLessonsPanel.tsx")).toContain("OfflineLessonViewer");
    expect(read("web/components/gigalearn/PracticeSession.tsx")).toContain(
      "queueOfflineAssessmentEvent"
    );
    expect(read("web/hooks/useGigaLearnOfflineProgressSync.ts")).toContain(
      "flushOfflineProgressQueue"
    );
  });
});

describe.skipIf(!hasIndexedDb)("GigaLearn offline remediation storage", () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase("giga3-gigalearn-offline");
    await new Promise((r) => setTimeout(r, 20));
  });

  it("lists and reopens saved offline lessons", async () => {
    await saveOfflineLesson({
      id: "lesson-1",
      title: "Algebra basics",
      content: "Lesson body for offline study.",
    });
    const listed = await listOfflineLessons();
    expect(listed.some((row) => row.id === "lesson-1")).toBe(true);
    const reopened = await getOfflineLesson("lesson-1");
    expect(reopened?.content).toContain("Lesson body");
  });

  it("queues offline progress and flushes without duplicate application", async () => {
    const clientEventId = newOfflineProgressEventId();
    await queueOfflineAssessmentEvent({
      clientEventId,
      topicKey: "math/fractions",
      subject: "math",
      score: 82,
      toolId: "practice-questions",
    });
    await queueOfflineAssessmentEvent({
      clientEventId,
      topicKey: "math/fractions",
      subject: "math",
      score: 82,
      toolId: "practice-questions",
    });
    expect(await listOfflineProgressEvents()).toHaveLength(1);

    const applied: string[] = [];
    const first = await flushOfflineProgressQueue(async (event) => {
      applied.push(event.clientEventId);
    });
    expect(first.synced).toBe(1);
    expect(applied).toEqual([clientEventId]);

    const second = await flushOfflineProgressQueue(async () => {
      applied.push("should-not-run");
    });
    expect(second.synced).toBe(0);
    expect(applied).toHaveLength(1);
  });

  it("keeps failed sync events retryable", async () => {
    const clientEventId = newOfflineProgressEventId();
    await queueOfflineAssessmentEvent({
      clientEventId,
      topicKey: "science",
      score: 70,
    });
    const result = await flushOfflineProgressQueue(async () => {
      throw new Error("network down");
    });
    expect(result.failed).toBe(1);
    expect((await listOfflineProgressEvents())[0]?.attempts).toBe(1);
    await removeOfflineProgressEvent(clientEventId);
  });
});
