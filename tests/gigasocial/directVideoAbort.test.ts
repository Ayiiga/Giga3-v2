import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(__dirname, "../../", path), "utf8");

describe("GigaSocial direct video upload cancellation", () => {
  it("stops retries on abort and handles already-aborted XHR requests", () => {
    const media = read("web/lib/gigasocial/mediaUpload.ts");
    const retries = media.slice(media.indexOf("async function withUploadRetry<T>("), media.indexOf("async function uploadWithProgress("));
    const xhr = media.slice(media.indexOf("const xhr = new XMLHttpRequest()"), media.indexOf("async function tryDirectSupabaseUpload("));
    expect(retries).toContain("throwIfUploadAborted(signal)");
    expect(retries).toContain("waitForUploadRetry(baseDelayMs * attempt, signal)");
    expect(media).toContain("signal?.addEventListener(\"abort\", onSignalAbort, { once: true })");
    expect(xhr).toContain('if (signal?.aborted)');
    expect(xhr).toContain('reject(new DOMException("Upload cancelled.", "AbortError"))');
    expect(xhr).toContain("removeEventListener");
  });

  it("threads the upload AbortSignal through each Supabase storage layer", () => {
    const media = read("web/lib/gigasocial/mediaUpload.ts");
    const storage = read("web/lib/supabase/storage.ts");
    const client = read("web/lib/supabase.ts");
    const videoUpload = media.slice(
      media.indexOf("export async function uploadSocialVideo("),
      media.indexOf("export async function uploadSocialAudio(")
    );
    expect(videoUpload).toContain("signal: options?.signal");
    expect(videoUpload).toContain("if (options?.signal?.aborted)");
    expect(media).toContain("if (args.signal?.aborted) throw error;");
    expect(storage).toContain("signal: args.signal");
    expect(client).toContain("signal: options?.signal");
  });
});
