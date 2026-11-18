// @vitest-environment happy-dom
import { fireEvent, within } from "@testing-library/dom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { GigaSocialComposer } from "../../web/components/gigasocial/GigaSocialComposer";

// The composer resolves Convex from the web install, which has its own React context.
vi.mock("../../web/node_modules/convex/dist/esm/react/index.js", () => ({
  useAction: vi.fn(),
  useMutation: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("reuses the text post request ID when the first acknowledgement times out", async () => {
  vi.useFakeTimers();
  const onSubmit = vi.fn<(post: { publishRequestId?: string }) => Promise<void>>()
    .mockImplementationOnce(() => new Promise<void>(() => {}))
    .mockResolvedValueOnce(undefined);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const screen = within(host);

  try {
    act(() => {
      root.render(<GigaSocialComposer sessionToken="session" initialBody="A text update" onSubmit={onSubmit} />);
    });
    const postButton = screen.getByRole("button", { name: "Post", exact: true });
    act(() => {
      fireEvent.click(postButton);
    });
    expect(onSubmit).toHaveBeenCalledOnce();
    const firstPost = onSubmit.mock.calls[0][0];
    expect(firstPost).toMatchObject({
      body: "A text update",
      postType: "text",
      mediaItems: undefined,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(45_000);
    });
    expect(screen.getByRole("alert").textContent).toContain("Tap Post again");

    await act(async () => {
      fireEvent.click(postButton);
    });
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(firstPost).toEqual(expect.objectContaining({
      publishRequestId: expect.stringMatching(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/),
    }));
    expect(onSubmit.mock.calls[1][0]).toEqual(firstPost);
    expect(screen.getByRole("status").textContent).toContain("Post published successfully");
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
