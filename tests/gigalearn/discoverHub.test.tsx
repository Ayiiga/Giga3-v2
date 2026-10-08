/**
 * @vitest-environment happy-dom
 */
import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiscoverHub } from "../../web/components/gigalearn/discover/DiscoverHub";

vi.mock("../../web/lib/gigalearn/speechSynthesis", () => ({
  speakWithGigaLearnVoice: vi.fn(async () => undefined),
}));

describe("DiscoverHub learner vertical slice", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("lets a KG2 learner open mango, hear, play, and save offline", async () => {
    render(<DiscoverHub preferredLevel="KG2" />);

    expect(screen.getByText("Discover")).toBeTruthy();
    expect(screen.getByText("Pictures & Objects")).toBeTruthy();
    expect(screen.getByText("My Offline Learning")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Pictures & Objects/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Mango/i }));

    await waitFor(() => {
      expect(screen.getByText("Hear the name")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /English/i }));
    fireEvent.click(screen.getByRole("button", { name: /🥭 Mango/i }));

    await waitFor(() => {
      expect(screen.getByText(/Yes! That is a mango/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Save for offline/i }));

    await waitFor(() => {
      expect(screen.getByText(/Saved on this device/i)).toBeTruthy();
    });

    // Simulate offline: navigator.onLine false + clear in-memory catalog path by
    // reopening only from My Offline Learning (IndexedDB snapshot).
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    fireEvent.click(screen.getByRole("button", { name: /Close/i }));
    fireEvent.click(screen.getByRole("button", { name: /My Offline Learning/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Mango/i })).toBeTruthy();
    });
    expect(window.navigator.onLine).toBe(false);
  });
});
