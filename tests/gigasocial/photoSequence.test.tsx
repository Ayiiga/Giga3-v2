// @vitest-environment happy-dom
import { createRoot } from "react-dom/client";
import { act, useCallback, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { usePhotoSequence } from "../../web/hooks/usePhotoSequence";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it("loops every four seconds and stops for interaction, backgrounding and user pause", () => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  const root = createRoot(host);
  function Gallery({ active }: { active: boolean }) {
    const [index, setIndex] = useState(0);
    const advance = useCallback(() => setIndex(i => (i + 1) % 2), []);
    const sequence = usePhotoSequence(index, 2, active, advance);
    return <button onClick={sequence.toggle}>{index}</button>;
  }
  const render = (active: boolean) => act(() => root.render(<Gallery active={active} />));
  render(true);
  const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
  tick(3999);
  expect(Number(host.textContent)).toBe(0);
  tick(1);
  expect(Number(host.textContent)).toBe(1);
  tick(4000);
  expect(Number(host.textContent)).toBe(0);
  render(false);
  tick(4000);
  expect(Number(host.textContent)).toBe(0);
  render(true);
  act(() => host.querySelector("button")!.click());
  tick(4000);
  expect(Number(host.textContent)).toBe(0);
  act(() => host.querySelector("button")!.click());
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  tick(4000);
  expect(Number(host.textContent)).toBe(0);
  hidden.mockRestore();
  act(() => root.unmount());
});
