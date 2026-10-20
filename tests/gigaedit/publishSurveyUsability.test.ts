/**
 * @vitest-environment happy-dom
 *
 * Regression: Save to Gallery still auto-opens the creator survey immediately,
 * but the survey must not trap the user away from Post to GigaSocial.
 */
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const submitMock = vi.fn();
const getSessionTokenMock = vi.fn(() => "session-token" as string | null);
const saveToDeviceMock = vi.fn();
const handoffMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSessionToken: () => getSessionTokenMock(),
}));

vi.mock("../../web/node_modules/convex/dist/esm/react/index.js", () => ({
  useMutation: () => submitMock,
}));

vi.mock("convex/_generated/api", () => ({
  api: { platformFeedback: { submitFeedback: "platformFeedback:submitFeedback" } },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => createElement("a", { href, className }, children),
}));

vi.mock("../../web/lib/gigaedit/downloadExport", () => ({
  saveExportedFileToDevice: (...args: unknown[]) => saveToDeviceMock(...args),
}));

vi.mock("../../web/lib/gigaedit/publishHandoff", () => ({
  handoffAndOpenGigaSocial: (...args: unknown[]) => handoffMock(...args),
  storePublishHandoff: vi.fn(),
}));

vi.mock("../../web/lib/gigaedit/publishQueue", () => ({
  enqueuePublishQueue: vi.fn(),
}));

vi.mock("../../web/lib/gigaedit/audioExtract", () => ({
  extractAudioFromVideo: vi.fn(async () => null),
}));

vi.mock("../../web/lib/gigaedit/soundLibrary", () => ({
  saveSound: vi.fn(),
}));

vi.mock("../../web/components/gigaedit/SoundLibraryPicker", () => ({
  SoundLibraryPicker: () => null,
}));

import {
  CreatorSurveyHost,
  CreatorSurveyManualLink,
} from "../../web/components/gigaedit/CreatorSurveyHost";
import { PublishScreen } from "../../web/components/gigaedit/PublishScreen";
import {
  isSurveyAutoPromptBlocked,
  offerCreatorSurvey,
  requestCreatorSurveyDismiss,
  shouldAutoOfferCreatorSurvey,
  subscribeCreatorSurveyDismiss,
  subscribeCreatorSurveyOffers,
} from "../../web/lib/gigaedit/creatorSurvey";

function sampleFile() {
  return new File([new Uint8Array([1, 2, 3, 4])], "clip.mp4", { type: "video/mp4" });
}

describe("shouldAutoOfferCreatorSurvey eligibility", () => {
  it("allows shared and downloaded; rejects cancelled and empty", () => {
    expect(shouldAutoOfferCreatorSurvey("shared")).toBe(true);
    expect(shouldAutoOfferCreatorSurvey("downloaded")).toBe(true);
    expect(shouldAutoOfferCreatorSurvey("cancelled")).toBe(false);
    expect(shouldAutoOfferCreatorSurvey(null)).toBe(false);
    expect(shouldAutoOfferCreatorSurvey(undefined)).toBe(false);
  });
});

describe("PublishScreen + CreatorSurveyHost — auto survey vs Post usability", () => {
  let root: Root | null = null;
  let host: HTMLDivElement;

  function renderPublishWithSurvey() {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const file = sampleFile();
    act(() => {
      root!.render(
        createElement(
          "div",
          null,
          createElement(CreatorSurveyHost),
          createElement(PublishScreen, {
            kind: "photo",
            editedFile: file,
            originalFile: file,
            aspectRatio: "1:1",
            projectId: "ge_publish_ux",
            starterTemplateId: "poster-promo",
            onClose: () => undefined,
          })
        )
      );
    });
  }

  function button(label: string | RegExp): HTMLButtonElement {
    const match = [...host.querySelectorAll("button")].find((candidate) =>
      typeof label === "string"
        ? candidate.textContent?.trim() === label
        : label.test(candidate.textContent ?? "")
    );
    if (!match) throw new Error(`Missing button ${label}`);
    return match as HTMLButtonElement;
  }

  async function click(el: Element) {
    await act(async () => {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("gigaedit-publish-dock-open");
    saveToDeviceMock.mockReset();
    handoffMock.mockReset();
    submitMock.mockReset();
    getSessionTokenMock.mockReturnValue("session-token");
    handoffMock.mockResolvedValue({ queued: false });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    host?.remove();
    localStorage.clear();
    document.documentElement.classList.remove("gigaedit-publish-dock-open");
  });

  it("marks html with publish-dock class while PublishScreen is mounted", () => {
    renderPublishWithSurvey();
    expect(document.documentElement.classList.contains("gigaedit-publish-dock-open")).toBe(
      true
    );
    act(() => {
      root?.unmount();
    });
    root = null;
    expect(document.documentElement.classList.contains("gigaedit-publish-dock-open")).toBe(
      false
    );
  });

  it("auto-opens the survey immediately after an eligible Save to Gallery", async () => {
    saveToDeviceMock.mockResolvedValue({ outcome: "shared" });
    renderPublishWithSurvey();
    expect(host.textContent).not.toContain("Help improve GigaEdits");

    await click(button("Save to Gallery"));
    await act(async () => {
      await Promise.resolve();
    });

    expect(saveToDeviceMock).toHaveBeenCalled();
    expect(host.textContent).toContain("Help improve GigaEdits");
    expect(host.querySelector(".gigaedit-survey-publish-hint")).toBeTruthy();
    expect(host.querySelector('[role="dialog"]')?.getAttribute("aria-modal")).toBe("false");
    // Sticky Post remains in the tree and enabled for the publishing path.
    const stickyPost = button(/^Post$/);
    expect(stickyPost.disabled).toBe(false);
    expect(host.textContent).toContain("Post on GigaSocial");
  });

  it("does not auto-open the survey when Save to Gallery is cancelled", async () => {
    saveToDeviceMock.mockResolvedValue({ outcome: "cancelled" });
    renderPublishWithSurvey();
    await click(button("Save to Gallery"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(host.textContent).not.toContain("Help improve GigaEdits");
    expect(host.textContent).toMatch(/Share cancelled/i);
  });

  it("auto-opens after downloaded outcome as well", async () => {
    saveToDeviceMock.mockResolvedValue({ outcome: "downloaded" });
    renderPublishWithSurvey();
    await click(button("Save to Gallery"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(host.textContent).toContain("Help improve GigaEdits");
    expect(
      (host.querySelector('input[name="export"][value="not_confirmed"]') as HTMLInputElement)
        .checked
    ).toBe(true);
  });

  it("dismisses the open survey when Post is pressed and still runs GigaSocial handoff", async () => {
    saveToDeviceMock.mockResolvedValue({ outcome: "shared" });
    renderPublishWithSurvey();
    await click(button("Save to Gallery"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(host.textContent).toContain("Help improve GigaEdits");

    await click(button(/^Post$/));
    await act(async () => {
      await Promise.resolve();
    });

    expect(host.textContent).not.toContain("Help improve GigaEdits");
    expect(isSurveyAutoPromptBlocked("ge_publish_ux")).toBe(true);
    expect(handoffMock).toHaveBeenCalledTimes(1);
    expect(handoffMock.mock.calls[0][0]).toMatchObject({
      kind: "photo",
      destination: "feed",
      projectId: "ge_publish_ux",
    });
  });

  it("keeps the manual feedback entry point on the publish screen", () => {
    renderPublishWithSurvey();
    expect(button(/Finished testing/)).toBeTruthy();
  });

  it("requestCreatorSurveyDismiss closes an open survey without submitting", async () => {
    renderPublishWithSurvey();
    await act(async () => {
      offerCreatorSurvey({
        projectId: "ge_publish_ux",
        starterId: "poster-promo",
        deviceSaveOutcome: "shared",
        source: "publish_save",
      });
    });
    expect(host.textContent).toContain("Help improve GigaEdits");
    await act(async () => {
      requestCreatorSurveyDismiss();
    });
    expect(host.textContent).not.toContain("Help improve GigaEdits");
    expect(submitMock).not.toHaveBeenCalled();
    expect(isSurveyAutoPromptBlocked("ge_publish_ux")).toBe(true);
  });
});

describe("Publish survey usability — source & CSS contracts", () => {
  it("keeps offerCreatorSurvey inside saveToDevice (not deferred / removed)", () => {
    const publish = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/PublishScreen.tsx"),
      "utf8"
    );
    const saveFn = publish.slice(
      publish.indexOf("async function saveToDevice"),
      publish.indexOf("async function shareExternal")
    );
    expect(saveFn).toContain("shouldAutoOfferCreatorSurvey");
    expect(saveFn).toContain("offerCreatorSurvey");
    expect(saveFn).toContain('source: "publish_save"');

    const postFn = publish.slice(
      publish.indexOf("async function publishToSocial"),
      publish.indexOf("async function saveDraft")
    );
    expect(postFn).toContain("requestCreatorSurveyDismiss");
    expect(postFn).toContain("handoffAndOpenGigaSocial");

    // Manual entry preserved.
    expect(publish).toContain("CreatorSurveyManualLink");
    expect(publish).toContain("gigaedit-publish-dock-open");
  });

  it("leaves a dock gap under the survey backdrop while publish is open", () => {
    const css = readFileSync(
      resolve(__dirname, "../../web/styles/gigaedit.css"),
      "utf8"
    );
    expect(css).toContain("html.gigaedit-publish-dock-open .gigaedit-survey-backdrop");
    expect(css).toContain("bottom: var(--gigaedit-publish-dock-height");
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toContain("html.gigaedit-publish-dock-open .gigaedit-publish-sticky");
    expect(css).toContain("z-index: 100");
  });

  it("exposes dismiss subscription without replacing the offer bus", () => {
    const seen: string[] = [];
    let dismissed = 0;
    const unsubOffer = subscribeCreatorSurveyOffers((o) => seen.push(o.source));
    const unsubDismiss = subscribeCreatorSurveyDismiss(() => {
      dismissed += 1;
    });
    offerCreatorSurvey({
      deviceSaveOutcome: "shared",
      source: "publish_save",
      starterId: "hook-reel",
    });
    requestCreatorSurveyDismiss();
    expect(seen).toEqual(["publish_save"]);
    expect(dismissed).toBe(1);
    unsubOffer();
    unsubDismiss();
  });

  it("manual feedback link still offers source=manual", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const offers: string[] = [];
    const unsub = subscribeCreatorSurveyOffers((o) => offers.push(o.source));
    act(() => {
      root.render(
        createElement(CreatorSurveyManualLink, {
          projectId: "ge_manual_ux",
          starterId: "hook-reel",
        })
      );
    });
    await act(async () => {
      const btn = [...host.querySelectorAll("button")].find((b) =>
        /Finished testing/.test(b.textContent ?? "")
      );
      btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(offers).toEqual(["manual"]);
    unsub();
    act(() => root.unmount());
    host.remove();
  });
});
