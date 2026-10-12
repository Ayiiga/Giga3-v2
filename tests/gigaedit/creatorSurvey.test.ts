/**
 * @vitest-environment happy-dom
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

import {
  CreatorSurveyHost,
  CreatorSurveyManualLink,
} from "../../web/components/gigaedit/CreatorSurveyHost";
import {
  buildCreatorSurveySubmitPayload,
  canSubmitCreatorSurvey,
  CREATOR_SURVEY_FEEDBACK_TYPE,
  CREATOR_SURVEY_TITLE,
  CREATOR_SURVEY_VERSION,
  defaultSurveyAnswersFromOffer,
  encodeCreatorSurveyBody,
  isSurveyAutoPromptBlocked,
  markSurveyDismissed,
  markSurveySubmitted,
  offerCreatorSurvey,
  resolveStarterFromNotes,
  subscribeCreatorSurveyOffers,
  type CreatorSurveyAnswers,
} from "../../web/lib/gigaedit/creatorSurvey";

function sampleAnswers(
  overrides: Partial<CreatorSurveyAnswers> = {}
): CreatorSurveyAnswers {
  return {
    starter: "hook-reel",
    taskCompleted: "yes",
    exportSaved: "yes",
    ease: 4,
    difficulty: "Trim was unclear",
    reuse: "maybe",
    improvement: "Clearer export button",
    wtp: "not_sure",
    priceHypothesis: "too_high",
    researchConsent: true,
    projectId: "ge_test_1",
    trigger: "post_export",
    ...overrides,
  };
}

describe("GigaEdits creator survey — contract & encoding", () => {
  it("resolves starter pack ids from project.notes and treats unknown honestly", () => {
    expect(resolveStarterFromNotes("hook-reel")).toBe("hook-reel");
    expect(resolveStarterFromNotes("yt-intro")).toBe("yt-intro");
    expect(resolveStarterFromNotes("poster-promo")).toBe("poster-promo");
    expect(resolveStarterFromNotes("thumb-click")).toBeNull();
    expect(resolveStarterFromNotes("")).toBeNull();
    expect(resolveStarterFromNotes(undefined)).toBeNull();
  });

  it("maps survey answers into existing submitFeedback contract (body + ease rating)", () => {
    const payload = buildCreatorSurveySubmitPayload(sampleAnswers());
    expect(payload.type).toBe(CREATOR_SURVEY_FEEDBACK_TYPE);
    expect(payload.title).toBe(CREATOR_SURVEY_TITLE);
    expect(payload.rating).toBe(4);
    expect(payload.body).toContain(`GigaEdits Creator Survey v${CREATOR_SURVEY_VERSION}`);
    expect(payload.body).toContain("starter: hook-reel");
    expect(payload.body).toContain("task_completed: yes");
    expect(payload.body).toContain("export_saved: yes");
    expect(payload.body).toContain("ease: 4");
    expect(payload.body).toContain("difficulty: Trim was unclear");
    expect(payload.body).toContain("reuse_starter: maybe");
    expect(payload.body).toContain("would_consider_paying: not_sure");
    expect(payload.body).toContain("price_hypothesis_usd100_year: too_high");
    expect(payload.body).toContain("research_consent: yes");
    expect(payload.body.length).toBeLessThanOrEqual(4000);
  });

  it("keeps rating meaning as ease 1–5 and rejects invalid ease", () => {
    expect(buildCreatorSurveySubmitPayload(sampleAnswers({ ease: 1 })).rating).toBe(1);
    expect(buildCreatorSurveySubmitPayload(sampleAnswers({ ease: 5 })).rating).toBe(5);
    expect(() =>
      buildCreatorSurveySubmitPayload(sampleAnswers({ ease: 0 as 1 }))
    ).toThrow(/1 to 5/);
  });

  it("never auto-prefills export=Yes; uses not_confirmed after delivery attempts", () => {
    expect(
      defaultSurveyAnswersFromOffer({
        projectId: "p1",
        starterId: "yt-intro",
        deviceSaveOutcome: "shared",
        source: "publish_save",
      })
    ).toMatchObject({
      starter: "yt-intro",
      exportSaved: "not_confirmed",
      trigger: "post_export",
    });
    expect(
      defaultSurveyAnswersFromOffer({
        projectId: "p1",
        starterId: "hook-reel",
        deviceSaveOutcome: "downloaded",
        source: "video_download",
      })
    ).toMatchObject({
      exportSaved: "not_confirmed",
      trigger: "post_export",
    });
    expect(
      defaultSurveyAnswersFromOffer({
        projectId: "p1",
        starterId: null,
        deviceSaveOutcome: null,
        source: "manual",
      })
    ).toMatchObject({
      starter: "other",
      exportSaved: "not_attempted",
      trigger: "manual",
    });
    expect(
      defaultSurveyAnswersFromOffer({
        projectId: "p1",
        starterId: "hook-reel",
        deviceSaveOutcome: "cancelled",
        source: "video_download",
      })
    ).toMatchObject({
      exportSaved: "not_attempted",
      trigger: "manual",
    });
  });

  it("requires core answers before submit", () => {
    expect(canSubmitCreatorSurvey(sampleAnswers())).toBe(true);
  });
});

describe("GigaEdits creator survey — local dismissal flags", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("blocks auto-prompt after dismiss or confirmed submit, without storing answers", () => {
    expect(isSurveyAutoPromptBlocked("ge_a")).toBe(false);
    markSurveyDismissed("ge_a");
    expect(isSurveyAutoPromptBlocked("ge_a")).toBe(true);
    const keys = Object.keys(localStorage);
    expect(keys.every((k) => !k.includes("Trim") && !localStorage.getItem(k)?.includes("Trim"))).toBe(
      true
    );

    localStorage.clear();
    markSurveySubmitted("ge_b");
    expect(isSurveyAutoPromptBlocked("ge_b")).toBe(true);
  });

  it("fails gracefully when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => markSurveyDismissed("ge_x")).not.toThrow();
    spy.mockRestore();
  });
});

describe("GigaEdits creator survey — offer bus & UI", () => {
  let root: Root | null = null;
  let host: HTMLDivElement;

  function renderHost(extra?: React.ReactElement) {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => {
      root!.render(
        createElement(
          "div",
          null,
          createElement(CreatorSurveyHost),
          extra ?? null
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

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    host?.remove();
    localStorage.clear();
    submitMock.mockReset();
    getSessionTokenMock.mockReset();
    getSessionTokenMock.mockReturnValue("session-token");
  });

  it("lets an authenticated user open the survey via manual entry", async () => {
    renderHost(
      createElement(CreatorSurveyManualLink, {
        projectId: "ge_manual",
        starterId: "hook-reel",
      })
    );
    await click(button(/Finished testing/));
    expect(host.textContent).toContain("Help improve GigaEdits");
    const starter = host.querySelector(
      'input[name="starter"][value="hook-reel"]'
    ) as HTMLInputElement;
    expect(starter.checked).toBe(true);
    const exportYes = host.querySelector(
      'input[name="export"][value="yes"]'
    ) as HTMLInputElement;
    expect(exportYes.checked).toBe(false);
    const notAttempted = host.querySelector(
      'input[name="export"][value="not_attempted"]'
    ) as HTMLInputElement;
    expect(notAttempted.checked).toBe(true);
  });

  it("does not submit when unauthenticated and keeps the draft", async () => {
    getSessionTokenMock.mockReturnValue(null);
    submitMock.mockResolvedValue({ id: "fb1" });
    renderHost();
    await act(async () => {
      offerCreatorSurvey({
        projectId: "ge_auth",
        starterId: "yt-intro",
        deviceSaveOutcome: "shared",
        source: "video_download",
      });
    });
    expect(host.textContent).toContain("Sign in to submit");
    expect(button("Submit feedback").disabled).toBe(true);
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("submits mapped payload and shows success only after mutation resolves", async () => {
    let resolveSubmit: (v: { id: string }) => void = () => undefined;
    submitMock.mockImplementation(
      () =>
        new Promise<{ id: string }>((resolve) => {
          resolveSubmit = resolve;
        })
    );
    renderHost();
    await act(async () => {
      offerCreatorSurvey({
        projectId: "ge_ok",
        starterId: "poster-promo",
        deviceSaveOutcome: "shared",
        source: "publish_save",
      });
    });
    const notConfirmed = host.querySelector(
      'input[name="export"][value="not_confirmed"]'
    ) as HTMLInputElement;
    expect(notConfirmed.checked).toBe(true);
    await click(button("Submit feedback"));
    expect(host.textContent).toContain("Sending");
    expect(host.textContent).not.toContain("Thank you — feedback sent");
    await act(async () => {
      resolveSubmit({ id: "fb_ok" });
      await Promise.resolve();
    });
    expect(submitMock).toHaveBeenCalledTimes(1);
    const args = submitMock.mock.calls[0][0];
    expect(args.sessionToken).toBe("session-token");
    expect(args.type).toBe("general");
    expect(args.title).toBe(CREATOR_SURVEY_TITLE);
    expect(args.rating).toBe(3);
    expect(args.body).toContain("starter: poster-promo");
    expect(args.body).toContain("export_saved: not_confirmed");
    expect(host.textContent).toContain("Thank you — feedback sent");
    expect(isSurveyAutoPromptBlocked("ge_ok")).toBe(true);
  });

  it("preserves draft on mutation failure and allows retry", async () => {
    submitMock
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ id: "fb2" });
    renderHost();
    await act(async () => {
      offerCreatorSurvey({
        projectId: "ge_retry",
        starterId: "hook-reel",
        deviceSaveOutcome: null,
        source: "manual",
      });
    });
    const difficulty = host.querySelector("textarea") as HTMLTextAreaElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      setter?.call(difficulty, "Join clips confusing");
      difficulty.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(button("Submit feedback"));
    expect(host.textContent).toMatch(/network down|try again/i);
    expect((host.querySelector("textarea") as HTMLTextAreaElement).value).toBe(
      "Join clips confusing"
    );
    expect(host.textContent).not.toContain("Thank you — feedback sent");

    await click(button("Submit feedback"));
    expect(submitMock).toHaveBeenCalledTimes(2);
    expect(submitMock.mock.calls[1][0].body).toContain("difficulty: Join clips confusing");
    expect(host.textContent).toContain("Thank you — feedback sent");
  });

  it("preserves draft when offline and does not call the mutation", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderHost();
    await act(async () => {
      offerCreatorSurvey({
        projectId: "ge_off",
        starterId: null,
        deviceSaveOutcome: null,
        source: "manual",
      });
    });
    await click(button("Submit feedback"));
    expect(submitMock).not.toHaveBeenCalled();
    expect(host.textContent).toMatch(/offline/i);
    expect(host.querySelector("form")).toBeTruthy();
    vi.restoreAllMocks();
    getSessionTokenMock.mockReturnValue("session-token");
  });

  it("Skip dismisses without submitting", async () => {
    renderHost();
    await act(async () => {
      offerCreatorSurvey({
        projectId: "ge_skip",
        starterId: "hook-reel",
        deviceSaveOutcome: "shared",
        source: "video_download",
      });
    });
    await click(button("Skip"));
    expect(submitMock).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain("Help improve GigaEdits");
    expect(isSurveyAutoPromptBlocked("ge_skip")).toBe(true);
  });

  it("does not auto-open survey when share was cancelled", async () => {
    renderHost();
    await act(async () => {
      offerCreatorSurvey({
        projectId: "ge_cancel",
        starterId: "hook-reel",
        deviceSaveOutcome: "cancelled",
        source: "video_download",
      });
    });
    expect(host.textContent).not.toContain("Help improve GigaEdits");
  });

  it("does not auto-prompt twice for repeated post-export callbacks", async () => {
    renderHost();
    await act(async () => {
      offerCreatorSurvey({
        projectId: "ge_dup",
        starterId: "hook-reel",
        deviceSaveOutcome: "shared",
        source: "video_download",
      });
    });
    expect(host.querySelectorAll('[role="dialog"]').length).toBe(1);
    await click(button("Skip"));
    await act(async () => {
      offerCreatorSurvey({
        projectId: "ge_dup",
        starterId: "hook-reel",
        deviceSaveOutcome: "shared",
        source: "video_download",
      });
    });
    expect(host.textContent).not.toContain("Help improve GigaEdits");
  });

  it("allows intentional manual reopen after dismiss", async () => {
    renderHost();
    await act(async () => {
      offerCreatorSurvey({
        projectId: "ge_reopen",
        starterId: "hook-reel",
        deviceSaveOutcome: "shared",
        source: "publish_save",
      });
    });
    await click(button("Skip"));
    await act(async () => {
      offerCreatorSurvey({
        projectId: "ge_reopen",
        starterId: "hook-reel",
        deviceSaveOutcome: null,
        source: "manual",
      });
    });
    expect(host.textContent).toContain("Help improve GigaEdits");
  });
});

describe("GigaEdits creator survey — wiring & regressions", () => {
  it("triggers survey only after non-cancelled device-save delivery attempts", () => {
    const video = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/VideoEditor.tsx"),
      "utf8"
    );
    const publish = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/PublishScreen.tsx"),
      "utf8"
    );
    const photo = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/PhotoEditor.tsx"),
      "utf8"
    );
    const client = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/GigaEditClient.tsx"),
      "utf8"
    );

    expect(video).toContain("offerCreatorSurvey");
    expect(video).toContain('source: "video_download"');
    expect(video).toContain("deviceSaveOutcome");
    expect(video).toContain("shouldAutoOfferCreatorSurvey");
    expect(video).toContain("savedProjectId");
    expect(video).toContain("saveExportedFileToDevice");
    // Bake-to-publish must not offer the survey.
    const bakeFn = video.slice(
      video.indexOf("async function openPublishOptions"),
      video.indexOf("async function exportAndDownload")
    );
    expect(bakeFn).not.toContain("offerCreatorSurvey");

    expect(publish).toContain("offerCreatorSurvey");
    expect(publish).toContain('source: "publish_save"');
    const shareFn = publish.slice(
      publish.indexOf("async function shareExternal"),
      publish.indexOf("return (")
    );
    expect(shareFn).not.toContain("offerCreatorSurvey");

    // Photo PNG download path must not call offerCreatorSurvey.
    expect(photo).not.toContain("offerCreatorSurvey");
    expect(photo).toContain("starterTemplateId");
    expect(photo).toContain("CreatorSurveyManualLink");
    expect(client).toContain("CreatorSurveyHost");
  });

  it("preserves starter notes across draft saves", () => {
    const video = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/VideoEditor.tsx"),
      "utf8"
    );
    const photo = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/PhotoEditor.tsx"),
      "utf8"
    );
    expect(video).toContain("existing?.notes");
    expect(photo).toContain("existing?.notes");
    expect(photo).toContain("if (projectId) project.id = projectId");
  });

  it("does not add anonymous APIs, new Convex tables, or alter platformFeedback schema", () => {
    const feedback = readFileSync(
      resolve(__dirname, "../../convex/platformFeedback.ts"),
      "utf8"
    );
    const schema = readFileSync(resolve(__dirname, "../../convex/schema.ts"), "utf8");
    expect(feedback).toContain("export const submitFeedback = mutation");
    expect(feedback).toContain("requireSession");
    expect(feedback).toContain("MAX_FEEDBACK_PER_HOUR = 8");
    expect(feedback).toContain("bodyFull");
    expect(feedback).toContain("GIGAEDITS_CREATOR_SURVEY_TITLE");
    expect(schema).not.toContain("gigaeditSurvey");
    expect(schema).not.toContain("creatorSurvey");
  });

  it("keeps existing FeedbackModal submit path intact", () => {
    const modal = readFileSync(
      resolve(__dirname, "../../web/components/feedback/FeedbackModal.tsx"),
      "utf8"
    );
    expect(modal).toContain("api.platformFeedback.submitFeedback");
    expect(modal).toContain("sessionToken");
    expect(modal).toContain("rating: rating > 0 ? rating : undefined");
  });

  it("offer bus delivers offers to a single subscriber", () => {
    const seen: string[] = [];
    const unsub = subscribeCreatorSurveyOffers((o) => seen.push(o.source));
    offerCreatorSurvey({
      deviceSaveOutcome: null,
      source: "manual",
      starterId: null,
    });
    expect(seen).toEqual(["manual"]);
    unsub();
    offerCreatorSurvey({
      deviceSaveOutcome: null,
      source: "manual",
      starterId: null,
    });
    expect(seen).toEqual(["manual"]);
  });
});

describe("GigaEdits creator survey — mobile layout", () => {
  let root: Root | null = null;
  let host: HTMLDivElement;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    host?.remove();
    localStorage.clear();
  });

  it("fits a 390×844 viewport without horizontal overflow", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    document.documentElement.style.width = "390px";
    host = document.createElement("div");
    host.style.width = "390px";
    host.style.overflow = "hidden";
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => {
      root!.render(createElement(CreatorSurveyHost));
    });
    await act(async () => {
      offerCreatorSurvey({
        projectId: "ge_mobile",
        starterId: "hook-reel",
        deviceSaveOutcome: "shared",
        source: "publish_save",
      });
    });
    const sheet = host.querySelector(".gigaedit-survey-sheet") as HTMLElement;
    expect(sheet).toBeTruthy();
    // happy-dom layout metrics are limited; enforce CSS constraints that keep mobile fit.
    const css = readFileSync(
      resolve(__dirname, "../../web/styles/gigaedit.css"),
      "utf8"
    );
    expect(css).toContain("width: min(100%, 26rem)");
    expect(css).toContain("max-height: min(90vh, 40rem)");
    expect(css).toContain("box-sizing: border-box");
    expect(host.textContent).toContain("Help improve GigaEdits");
    expect(host.querySelector(".gigaedit-survey-actions")).toBeTruthy();
  });
});
