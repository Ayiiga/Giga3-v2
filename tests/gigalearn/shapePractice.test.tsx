// @vitest-environment happy-dom

import { getByRole, getByText } from "@testing-library/dom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { ShapePractice } from "../../web/components/gigalearn/ShapePractice";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("highlights the tapped answer, explains it immediately and resets selection between questions", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const button = (name: string) => getByRole(host, "button", { name }) as HTMLButtonElement;
  const feedback = () => getByRole(host, "status").textContent;

  try {
    act(() => root.render(<ShapePractice />));
    const circle = button("Circle");
    const sphere = button("Sphere");
    const next = button("Next question");

    act(() => circle.click());
    expect(circle.getAttribute("aria-pressed")).toBe("true");
    expect(sphere.getAttribute("aria-pressed")).toBe("false");
    expect(feedback()).toMatch(/Try again.*circle is flat/);
    expect(next.disabled).toBe(true);

    act(() => sphere.click());
    expect(circle.getAttribute("aria-pressed")).toBe("false");
    expect(sphere.getAttribute("aria-pressed")).toBe("true");
    expect(feedback()).toMatch(/Correct.*sphere is round/);
    act(() => next.click());

    expect(button("Cuboid").getAttribute("aria-pressed")).toBe("false");
    expect(feedback()).toBe("");
    act(() => button("Cuboid").click());
    act(() => button("Next question").click());
    act(() => button("Cube").click());
    act(() => button("See the home activity").click());

    expect(feedback()).toMatch(/trace one face of a carton/);
    act(() => button("Play again").click());
    expect(getByText(host, "Question 1 of 3")).toBeTruthy();
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
