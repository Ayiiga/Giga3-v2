// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { PracticeExample } from "../../web/components/seo/PracticeExample";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it("gives the correct feedback for the actual option chosen and lets a learner retry", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<PracticeExample question="What is 2 + 3?" options={["4", "5", "6"]} correctIndex={1} explanation="Add three to two to get five." />));
    const buttons = host.querySelectorAll("button");
    await act(async () => buttons[2].click());
    expect(host.querySelector('[role="status"]')?.textContent).toContain("Incorrect. The correct answer is 5.");
    expect(buttons[2].getAttribute("aria-pressed")).toBe("true");
    await act(async () => buttons[1].click());
    expect(host.querySelector('[role="status"]')?.textContent).toContain("Correct. Add three");
    expect(buttons[2].getAttribute("aria-pressed")).toBe("false");
    expect(host.querySelector("details")?.textContent).toContain("5. Add three");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
