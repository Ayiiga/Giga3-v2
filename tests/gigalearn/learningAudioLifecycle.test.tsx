// @vitest-environment happy-dom
import { fireEvent, within } from "@testing-library/dom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { FoundationReading } from "../../web/components/gigalearn/FoundationReading";
import { FoundationPractical } from "../../web/components/gigalearn/FoundationPracticals";
import { useDiscoveryAudio } from "../../web/components/gigalearn/DiscoveryPictureLesson";

const { speak, stop } = vi.hoisted(() => ({
  speak: vi.fn<(args: { text: string; onEnd?: () => void }) => Promise<boolean>>(),
  stop: vi.fn(),
}));
vi.mock("@/lib/gigalearn/speechSynthesis", () => ({
  speakWithGigaLearnVoice: speak, stopGigaLearnVoice: stop,
}));

function mount() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  return { root, screen: within(host), dispose: () => { act(() => root.unmount()); host.remove(); } };
}

afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

it("retains the reading request until completion, and stops on exit", async () => {
  speak.mockResolvedValue(true);
  const { root, screen, dispose } = mount();
  try {
    await act(async () => root.render(<FoundationReading />));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Read the story aloud" })));
    expect(screen.getByRole("button", { name: "Stop reading" })).toBeTruthy();
    const first = speak.mock.calls[0]![0];
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Stop reading" })));
    expect(stop).toHaveBeenCalledTimes(1);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Read the story aloud" })));
    act(() => first.onEnd?.());
    expect(screen.getByRole("button", { name: "Stop reading" })).toBeTruthy();
    act(() => speak.mock.calls[1]![0].onEnd?.());
    expect(screen.getByRole("button", { name: "Read the story aloud" })).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Read the story aloud" })));
  } finally { dispose(); }
  expect(stop).toHaveBeenCalledTimes(2);
});

it("cancels old phonics or rhyme audio when switching activity", async () => {
  speak.mockResolvedValue(true);
  const { root, screen, dispose } = mount();
  try {
    await act(async () => root.render(<FoundationPractical activity="rhyme" />));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Hear the words" })));
    await act(async () => root.render(<FoundationPractical activity="phonics" />));
    expect(stop).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Which word starts with the same sound as moon?")).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Hear the words" })));
  } finally { dispose(); }
  expect(stop).toHaveBeenCalledTimes(2);
});

it("retains Discovery media until ended and ignores stale errors after switching", async () => {
  const players: FakeAudio[] = [];
  class FakeAudio {
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    pause = vi.fn();
    load = vi.fn();
    removeAttribute = vi.fn();
    play = vi.fn(async () => {});
    constructor(public src: string) { players.push(this); }
  }
  vi.stubGlobal("Audio", FakeAudio);
  function Probe() {
    const { play, stop: stopAudio, audioError } = useDiscoveryAudio();
    return <><button onClick={() => play("mango")}>Mango</button><button onClick={() => play("orange")}>Orange</button><button onClick={stopAudio}>Stop</button>{audioError && <p>Error</p>}</>;
  }
  const { root, screen, dispose } = mount();
  try {
    await act(async () => root.render(<Probe />));
    await act(async () => fireEvent.click(screen.getByText("Mango")));
    expect(players[0]!.pause).not.toHaveBeenCalled();
    const staleError = players[0]!.onerror;
    await act(async () => fireEvent.click(screen.getByText("Orange")));
    expect(players[0]!.pause).toHaveBeenCalledTimes(1);
    act(() => staleError?.());
    expect(screen.queryByText("Error")).toBeNull();
    expect(players[1]!.pause).not.toHaveBeenCalled();
    act(() => players[1]!.onended?.());
    expect(players[1]!.pause).toHaveBeenCalledTimes(1);
    await act(async () => fireEvent.click(screen.getByText("Mango")));
  } finally { dispose(); }
  expect(players[2]!.pause).toHaveBeenCalledTimes(1);
});
