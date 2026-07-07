import { describe, expect, it } from "vitest";
import { generationCoordinator } from "../../web/lib/generation/coordinator";

describe("generationCoordinator", () => {
  it("dedupes completion notifications for the same task", () => {
    const id = "test:chat:1";
    generationCoordinator.start({
      id,
      kind: "chat",
      label: "Generating response…",
    });
    generationCoordinator.complete(id);
    generationCoordinator.complete(id);
    const task = generationCoordinator.getTasks().find((row) => row.id === id);
    expect(task?.state).toBe("completed");
    expect(task?.notified).toBe(true);
    expect(generationCoordinator.getToasts().filter((t) => t.kind === "chat").length).toBeLessThanOrEqual(1);
  });
});
