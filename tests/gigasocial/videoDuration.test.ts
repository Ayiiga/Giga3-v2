/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isUsableVideoDuration,
  readSocialVideoDuration,
} from "../../web/lib/gigasocial/videoDuration";
import {
  isLikelySocialVideoFile,
  resolveVideoContentType,
} from "../../web/lib/gigasocial/constants";

describe("isUsableVideoDuration", () => {
  it("accepts a valid 13-second duration", () => {
    expect(isUsableVideoDuration(13)).toBe(true);
    expect(isUsableVideoDuration(13.4)).toBe(true);
  });

  it("rejects missing, zero, NaN, and Infinity", () => {
    expect(isUsableVideoDuration(0)).toBe(false);
    expect(isUsableVideoDuration(-1)).toBe(false);
    expect(isUsableVideoDuration(Number.NaN)).toBe(false);
    expect(isUsableVideoDuration(Infinity)).toBe(false);
  });
});

describe("resolveVideoContentType / Android empty MIME", () => {
  it("resolves extension when browser leaves type empty", () => {
    expect(resolveVideoContentType({ name: "clip.mp4", type: "" })).toBe("video/mp4");
    expect(resolveVideoContentType({ name: "clip.MOV", type: "" })).toBe("video/quicktime");
    expect(resolveVideoContentType({ name: "clip.webm", type: "" })).toBe("video/webm");
    expect(isLikelySocialVideoFile({ name: "IMG_001.mp4", type: "" })).toBe(true);
  });

  it("maps common Android aliases", () => {
    expect(resolveVideoContentType({ name: "a.3gp", type: "video/3gpp" })).toBe("video/mp4");
    expect(resolveVideoContentType({ name: "a.m4v", type: "video/x-m4v" })).toBe("video/mp4");
  });

  it("rejects unsupported containers", () => {
    expect(resolveVideoContentType({ name: "a.mkv", type: "video/x-matroska" })).toBeNull();
    expect(resolveVideoContentType({ name: "notes.txt", type: "" })).toBeNull();
  });
});

describe("readSocialVideoDuration", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mockVideo(opts: {
    duration: number;
    event?: "loadedmetadata" | "durationchange" | "error";
    delayMs?: number;
  }) {
    const listeners = new Map<string, Set<EventListener>>();
    const video = {
      preload: "metadata",
      muted: false,
      defaultMuted: false,
      playsInline: false,
      duration: Number.NaN,
      currentTime: 0,
      seekable: { length: 0 },
      src: "",
      onloadedmetadata: null as ((ev: Event) => void) | null,
      onloadeddata: null as ((ev: Event) => void) | null,
      ondurationchange: null as ((ev: Event) => void) | null,
      onerror: null as ((ev: Event) => void) | null,
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
      load: vi.fn(),
      addEventListener(type: string, listener: EventListener) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(listener);
      },
      removeEventListener(type: string, listener: EventListener) {
        listeners.get(type)?.delete(listener);
      },
      dispatch(type: string) {
        const event = new Event(type);
        listeners.get(type)?.forEach((listener) => listener(event));
        const handlerName = `on${type}` as keyof typeof video;
        const handler = video[handlerName];
        if (typeof handler === "function") {
          (handler as (ev: Event) => void)(event);
        }
      },
    };

    const delay = opts.delayMs ?? 0;
    queueMicrotask(() => {
      const fire = () => {
        if (opts.event === "error") {
          video.dispatch("error");
          return;
        }
        video.duration = opts.duration;
        video.dispatch(opts.event ?? "loadedmetadata");
      };
      if (delay > 0) {
        window.setTimeout(fire, delay);
      } else {
        fire();
      }
    });

    return video as unknown as HTMLVideoElement;
  }

  it("reads a finite 13s duration from loadedmetadata", async () => {
    const file = new File([new Uint8Array([0, 1, 2])], "clip.mp4", { type: "video/mp4" });
    const duration = await readSocialVideoDuration(file, {
      createVideoElement: () => mockVideo({ duration: 13 }),
      createObjectURL: () => "blob:mock-13",
      revokeObjectURL: vi.fn(),
      retries: 1,
    });
    expect(duration).toBe(13);
  });

  it("handles delayed metadata without treating the probe as failed", async () => {
    vi.useFakeTimers();
    const file = new File([new Uint8Array([0])], "slow.mp4", { type: "video/mp4" });
    const promise = readSocialVideoDuration(file, {
      createVideoElement: () => mockVideo({ duration: 13, delayMs: 40 }),
      createObjectURL: () => "blob:mock-slow",
      revokeObjectURL: vi.fn(),
      retries: 1,
      timeoutMs: 2000,
    });
    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).resolves.toBe(13);
  });

  it("accepts duration discovered via durationchange", async () => {
    const file = new File([new Uint8Array([1])], "dc.mp4", { type: "video/mp4" });
    const duration = await readSocialVideoDuration(file, {
      createVideoElement: () => mockVideo({ duration: 17, event: "durationchange" }),
      createObjectURL: () => "blob:mock-dc",
      revokeObjectURL: vi.fn(),
      retries: 1,
    });
    expect(duration).toBe(17);
  });

  it("keeps probing after recoverable seek error and accepts later finite duration", async () => {
    const listeners = new Map<string, Set<EventListener>>();
    let currentTimeValue = 0;
    const video = {
      preload: "metadata",
      muted: false,
      defaultMuted: false,
      playsInline: false,
      duration: Infinity,
      seekable: { length: 0 },
      src: "",
      onloadedmetadata: null as ((ev: Event) => void) | null,
      onloadeddata: null as ((ev: Event) => void) | null,
      ondurationchange: null as ((ev: Event) => void) | null,
      onerror: null as ((ev: Event) => void) | null,
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
      load: vi.fn(),
      addEventListener(type: string, listener: EventListener) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(listener);
      },
      removeEventListener(type: string, listener: EventListener) {
        listeners.get(type)?.delete(listener);
      },
      dispatch(type: string) {
        const event = new Event(type);
        listeners.get(type)?.forEach((listener) => listener(event));
        const handlerName = `on${type}` as keyof typeof video;
        const handler = video[handlerName];
        if (typeof handler === "function") {
          (handler as (ev: Event) => void)(event);
        }
      },
    };
    Object.defineProperty(video, "currentTime", {
      get() {
        return currentTimeValue;
      },
      set(value: number) {
        currentTimeValue = value;
        if (value === 1e101) {
          queueMicrotask(() => {
            video.dispatch("error");
            queueMicrotask(() => {
              video.duration = 23;
              video.dispatch("durationchange");
            });
          });
        }
      },
      configurable: true,
    });

    queueMicrotask(() => {
      video.dispatch("loadedmetadata");
    });

    const file = new File([new Uint8Array([1])], "seek-error.mp4", {
      type: "video/mp4",
    });
    const duration = await readSocialVideoDuration(file, {
      createVideoElement: () => video as unknown as HTMLVideoElement,
      createObjectURL: () => "blob:mock-seek-error",
      revokeObjectURL: vi.fn(),
      retries: 1,
      timeoutMs: 2000,
    });
    expect(duration).toBe(23);
  });

  it("aborts when a newer selection cancels the probe", async () => {
    const file = new File([new Uint8Array([0])], "a.mp4", { type: "video/mp4" });
    const controller = new AbortController();
    const promise = readSocialVideoDuration(file, {
      signal: controller.signal,
      createVideoElement: () => mockVideo({ duration: 13, delayMs: 500 }),
      createObjectURL: () => "blob:mock-abort",
      revokeObjectURL: vi.fn(),
      retries: 1,
      timeoutMs: 5000,
    });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("surfaces actionable errors for corrupt media", async () => {
    const file = new File([new Uint8Array([0])], "bad.mp4", { type: "video/mp4" });
    await expect(
      readSocialVideoDuration(file, {
        createVideoElement: () => mockVideo({ duration: 0, event: "error" }),
        createObjectURL: () => "blob:mock-bad",
        revokeObjectURL: vi.fn(),
        retries: 1,
      })
    ).rejects.toThrow(/Could not read video duration/);
  });

  it("rejects zero/invalid duration instead of bypassing validation", async () => {
    const file = new File([new Uint8Array([0])], "zero.mp4", { type: "video/mp4" });
    await expect(
      readSocialVideoDuration(file, {
        createVideoElement: () => mockVideo({ duration: 0 }),
        createObjectURL: () => "blob:mock-zero",
        revokeObjectURL: vi.fn(),
        retries: 1,
      })
    ).rejects.toThrow(/Could not read video duration/);
  });
});

describe("mediaComposer Android empty-type video", () => {
  it("classifies extension-only Android gallery video as single-video", async () => {
    const { classifyMediaFiles } = await import("../../web/lib/gigasocial/mediaComposer");
    const file = new File([new Uint8Array([0])], "VID_2026.mp4", { type: "" });
    expect(classifyMediaFiles([file])).toEqual({
      kind: "single-video",
      files: [file],
    });
  });
});

describe("composer wiring for duration probe", () => {
  it("opens media review after a successful video probe", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const composer = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialComposer.tsx"),
      "utf8"
    );
    expect(composer).toContain("getVideoDuration(file, { signal: controller.signal })");
    expect(composer).toContain('kind: "video"');
    expect(composer).toContain("setMediaReviewDraft");
    expect(composer).toContain("Reading video duration");
    expect(composer).toContain("resolveVideoContentType");
    expect(composer).toContain("readInputFilesAndReset");
    expect(composer).toContain("event.currentTarget");
    expect(composer).toContain("videoProbeAbortRef.current?.abort()");
    expect(composer).toContain("videoProbeGenerationRef.current");
    expect(composer).not.toMatch(
      /addVideoFile[\s\S]{0,400}finish\(Number\.isFinite\(video\.duration\) \? video\.duration : 0\)/
    );
  });

  it("captures picker files before resetting input value", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const composer = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialComposer.tsx"),
      "utf8"
    );
    const copyIndex = composer.indexOf("const files = input.files ? Array.from(input.files) : []");
    const resetIndex = composer.indexOf("input.value = \"\"");
    expect(copyIndex).toBeGreaterThan(-1);
    expect(resetIndex).toBeGreaterThan(-1);
    expect(copyIndex).toBeLessThan(resetIndex);
    expect(composer).not.toContain("void handleUnifiedMediaPick(event.target.files)");
  });

  it("media review supports replace/remove and continue-to-post", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const review = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/studio/GigaSocialMediaReview.tsx"),
      "utf8"
    );
    expect(review).toContain("onReplace");
    expect(review).toContain("onRemove");
    expect(review).toContain("Continue to post");
    expect(review).toContain("Duration");
    expect(review).toContain("popstate");
  });
});
