// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TechHubPractice } from "../../web/components/gigalearn/academy/TechHubPractice";

const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams("course=exam-wassce-english&mode=learn"),
}));
vi.mock("@/lib/auth", () => ({ getSessionToken: () => "test-session" }));
vi.mock("@/components/providers/ConvexAppShell", () => ({ ConvexAppShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/gigalearn/academy/AcademyChrome", () => ({ AcademyChrome: ({ children }: { children: ReactNode }) => children }));
vi.mock("../../web/node_modules/convex/dist/esm/react/index.js", async () => {
  const { api } = await import("convex/_generated/api");
  const { getFunctionName } = await import("convex/server");
  return {
    useQuery: (ref: Parameters<typeof getFunctionName>[0]) =>
      getFunctionName(ref) === getFunctionName(api.gigaLearnTechBanks.getTechCoursePracticeSummary)
        ? { enrolled: true, bankReady: true } : undefined,
    useMutation: (ref: Parameters<typeof getFunctionName>[0]) => {
      const name = getFunctionName(ref);
      if (name.endsWith(":saveTechPracticeAnswer")) return save;
      return async () => ({
        sessionId: "attempt",
        questions: [
          { questionId: "q1", topicLabel: "Grammar", questionText: "First question?", options: ["Alpha option", "Bravo option", "Charlie option", "Delta option"], difficulty: "medium" },
          { questionId: "q2", topicLabel: "Grammar", questionText: "Second question?", options: ["Another answer", "Different answer"], difficulty: "medium" },
        ],
      });
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  save.mockReset();
});

function findButton(label: RegExp) {
  const result = Array.from(host!.querySelectorAll("button")).find((button) => label.test(button.textContent ?? ""));
  if (!result) throw new Error(`Missing button ${label}`);
  return result;
}

async function openQuestion() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root!.render(<TechHubPractice />));
  await act(async () => findButton(/start practice test/i).click());
  return findButton(/bravo option/i);
}

describe("WASSCE answer taps on a slow connection", () => {
  it("highlights the tapped option before the save returns and ignores a second tap", async () => {
    let acknowledge!: (result: object) => void;
    save.mockReturnValue(new Promise<object>((resolve) => { acknowledge = resolve; }));
    const answer = await openQuestion();
    act(() => answer.click());
    expect(answer.getAttribute("aria-pressed")).toBe("true");
    expect(answer.textContent).toContain("Saving…");
    act(() => findButton(/charlie option/i).click());
    expect(save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ questionId: "q1", selectedIndex: 1 }));
    await act(async () => acknowledge({ saved: true, feedback: { selectedIndex: 1, correct: true, correctIndex: 1, explanation: "Verified example." } }));
    expect(host?.textContent).toContain("Verified example.");
    expect(answer.getAttribute("aria-pressed")).toBe("true");
  });

  it("clears the unsaved highlight and lets the learner retry when saving fails", async () => {
    save.mockRejectedValueOnce(new Error("Connection dropped"));
    const answer = await openQuestion();
    await act(async () => answer.click());
    expect(answer.getAttribute("aria-pressed")).toBe("false");
    expect(answer.disabled).toBe(false);
    expect(host?.querySelector('[role="alert"]')?.textContent).toContain("Connection dropped");
  });
});
