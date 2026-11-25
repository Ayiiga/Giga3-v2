// @vitest-environment happy-dom
import { fireEvent, within } from "@testing-library/dom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { GigaSocialComposer } from "../../web/components/gigasocial/GigaSocialComposer";

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("../../web/node_modules/convex/dist/esm/react/index.js", () => ({
  useAction: vi.fn(),
  useMutation: vi.fn(),
}));
vi.mock("@/lib/gigasocial/mediaUpload", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/gigasocial/mediaUpload")>(),
  getVideoDuration: async () => 900,
  uploadSocialVideo: upload,
}));
vi.mock("@/components/gigasocial/studio/GigaSocialEpisodeConfirm", () => ({
  GigaSocialEpisodeConfirm: ({ file, onConfirm }: {
    file: File;
    onConfirm: (result: { episodes: unknown[] }) => void;
  }) => (
    <button onClick={() => onConfirm({
      episodes: [1, 2, 3].map((index) => ({
        index, file, durationSec: 300, title: `Part ${index}`, body: `Part ${index}`,
      })),
    })}>Confirm test episodes</button>
  ),
}));

it("resumes at the unconfirmed episode without uploading it again or creating a second publish ID", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  upload.mockResolvedValue({ type: "video", url: "https://example.test/clip.mp4" });
  const submit = vi.fn<(post: { body: string; publishRequestId?: string }) => Promise<void>>()
    .mockResolvedValue(undefined)
    .mockResolvedValueOnce(undefined)
    .mockImplementationOnce(() => new Promise<void>(() => {}));
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  const screen = within(host);
  try {
    await act(async () => root.render(
      <GigaSocialComposer sessionToken="test" initialMedia={{ video: new File(["video"], "video.mp4", { type: "video/mp4" }) }} onSubmit={submit} />
    ));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Confirm test episodes" })));
    expect(submit.mock.calls.map(([post]) => post.body)).toEqual(["Part 1", "Part 2"]);
    await act(async () => vi.advanceTimersByTimeAsync(45_000));
    expect(screen.getByText("1 of 3 episodes confirmed.")).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Resume upload" })));
    expect(submit.mock.calls.map(([post]) => post.body)).toEqual(["Part 1", "Part 2", "Part 2", "Part 3"]);
    expect(submit.mock.calls[2][0]).toEqual(submit.mock.calls[1][0]);
    expect(new Set(submit.mock.calls.map(([post]) => post.publishRequestId)).size).toBe(3);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("status").textContent).toContain("Published 3 episodes");
  } finally {
    act(() => root.unmount());
    host.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
