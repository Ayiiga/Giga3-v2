import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadSocialVideo, waitForSocialRequest, type SocialMediaUploadDeps } from "../../web/lib/gigasocial/mediaUpload";

class UploadRequest {
  static current: UploadRequest | undefined;
  readonly upload: { onprogress?: (event: object) => void } = {};
  status = 204;
  statusText = "No Content";
  responseText = "";
  onload?: () => void;
  onabort?: () => void;
  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn(() => { UploadRequest.current = this; });
  abort = vi.fn(() => this.onabort?.());
}

const deps: SocialMediaUploadDeps = {
  sessionToken: "session",
  prepareUpload: async () => ({
    provider: "supabase",
    bucket: "social-videos",
    objectPath: "user/video.mp4",
    uploadUrl: "https://storage.example/sign/video.mp4?token=signed",
    uploadToken: "signed",
    publicUrl: "https://storage.example/public/video.mp4",
    contentType: "video/mp4",
  }),
  resolveStorageUrl: async () => ({ url: "https://storage.example/video.mp4" }),
};

async function startVideoUpload(signal?: AbortSignal) {
  const onProgress = vi.fn();
  const result = uploadSocialVideo(deps, new File(["video"], "video.mp4", { type: "video/mp4" }), {
    durationSec: 75,
    onProgress,
    signal,
  });
  await vi.waitFor(() => expect(UploadRequest.current).toBeDefined());
  return { result, onProgress, request: UploadRequest.current! };
}

afterEach(() => {
  UploadRequest.current = undefined;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("GigaSocial video upload recovery", () => {
  it("reports transferred bytes and accepts an empty successful storage response", async () => {
    vi.stubGlobal("XMLHttpRequest", UploadRequest);
    const { result, request, onProgress } = await startVideoUpload();
    request.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
    expect(onProgress).toHaveBeenCalledWith({ loaded: 5, total: 10, percent: 50 });
    request.onload?.();
    await expect(result).resolves.toMatchObject({ type: "video", durationSec: 75 });
  });

  it("permits a slow transfer that progresses and aborts after sixty idle seconds", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("XMLHttpRequest", UploadRequest);
    const { result, request } = await startVideoUpload();
    const rejected = expect(result).rejects.toThrow("Upload stalled");
    await vi.advanceTimersByTimeAsync(45_000);
    request.upload.onprogress?.({ lengthComputable: true, loaded: 2, total: 10 });
    await vi.advanceTimersByTimeAsync(45_000);
    expect(request.abort).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(15_000);
    await rejected;
    expect(request.abort).toHaveBeenCalledOnce();
  });

  it("aborts an active transfer when the composer cancels", async () => {
    vi.stubGlobal("XMLHttpRequest", UploadRequest);
    const controller = new AbortController();
    const { result, request } = await startVideoUpload(controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(request.abort).toHaveBeenCalledOnce();
  });

  it("does not prepare an upload when the composer has already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const prepareUpload = vi.fn(deps.prepareUpload);
    await expect(uploadSocialVideo(
      { ...deps, prepareUpload },
      new File(["video"], "video.mp4", { type: "video/mp4" }),
      { durationSec: 75, signal: controller.signal }
    )).rejects.toMatchObject({ name: "AbortError" });
    expect(prepareUpload).not.toHaveBeenCalled();
  });

  it("bounds an unacknowledged publish request", async () => {
    vi.useFakeTimers();
    const result = waitForSocialRequest(new Promise<void>(() => {}), 45_000, "Publish timed out");
    const rejected = expect(result).rejects.toThrow("Publish timed out");
    await vi.advanceTimersByTimeAsync(45_000);
    await rejected;
  });
});
