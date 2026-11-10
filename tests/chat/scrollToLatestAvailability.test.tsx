// @vitest-environment happy-dom
import { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { useScrollToLatestMessage } from "../../web/hooks/useScrollToLatestMessage";

function Fixture({ hasMessages }: { hasMessages: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showScrollButton } = useScrollToLatestMessage({
    scrollRef,
    scrollKey: undefined,
    enabled: hasMessages,
  });
  return <div ref={scrollRef}>{showScrollButton && <button>Latest</button>}</div>;
}

it("does not show Latest on a scrollable home screen or keep it when leaving a thread", () => {
  const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    act(() => root.render(<Fixture hasMessages={false} />));
    const scroller = host.firstElementChild as HTMLElement;
    Object.defineProperties(scroller, {
      scrollHeight: { value: 1000 },
      clientHeight: { value: 400 },
    });
    act(() => scroller.dispatchEvent(new Event("scroll")));
    expect(host.querySelector("button")).toBeNull();

    act(() => root.render(<Fixture hasMessages />));
    expect(host.querySelector("button")?.textContent).toBe("Latest");

    act(() => root.render(<Fixture hasMessages={false} />));
    expect(host.querySelector("button")).toBeNull();
  } finally {
    act(() => root.unmount());
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  }
});
