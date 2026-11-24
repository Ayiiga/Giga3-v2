"use client";

import { compressImageFile } from "@/lib/chat/imageCompress";
import {
  isSupabaseConfigured,
  requireSupabaseClient,
  type SupabaseRestClient,
} from "@/lib/supabase";
import {
  buildUserStoragePath,
  uploadSupabaseStorageObject,
} from "@/lib/supabase/storage";
import type { Id } from "convex/_generated/dataModel";
import { assertSupportedAudioFile, prepareAudioForPhotoPost } from "@/lib/gigasocial/audioProcessing";
import {
  SOCIAL_AVATAR_BUCKETS,
  SOCIAL_AUDIO_BUCKETS,
  SOCIAL_IMAGE_BUCKETS,
  SOCIAL_MAX_AUDIO_BYTES,
  SOCIAL_MAX_AUDIO_DURATION_SEC,
  SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC,
  SOCIAL_MAX_AVATAR_BYTES,
  SOCIAL_MAX_IMAGE_BYTES,
  SOCIAL_MAX_PHOTOS_PER_POST,
  SOCIAL_MAX_VIDEO_BYTES,
  SOCIAL_MAX_VIDEO_DURATION_SEC,
  SOCIAL_MAX_VIDEO_MB,
  SOCIAL_VIDEO_BUCKETS,
  resolveImageContentType,
  resolveVideoContentType,
  type SocialPostMediaItemInput,
  type SocialUploadProgress,
} from "@/lib/gigasocial/constants";
import {
  isUsableVideoDuration,
  readSocialVideoDuration,
  type ReadVideoDurationOptions,
} from "@/lib/gigasocial/videoDuration";

const ACCESS_TOKEN_KEY = "giga3_supabase_access_token";

type PrepareUploadResult =
  | {
      provider: "supabase";
      bucket: string;
      objectPath: string;
      uploadUrl: string;
      uploadToken: string;
      publicUrl: string;
      contentType: string;
    }
  | {
      provider: "convex";
      uploadUrl: string;
      objectPath: string;
      contentType: string;
    };

export type SocialMediaUploadDeps = {
  prepareUpload: (args: {
    sessionToken: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    kind: "image" | "video" | "audio";
  }) => Promise<PrepareUploadResult>;
  resolveStorageUrl: (args: {
    sessionToken: string;
    storageId: Id<"_storage">;
  }) => Promise<{ url: string }>;
  sessionToken: string;
};

function getSupabaseAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function validateImageFile(file: File): void {
  if (!resolveImageContentType(file)) {
    throw new Error("Unsupported image type. Use JPG, PNG, or WEBP.");
  }
  if (file.size > SOCIAL_MAX_IMAGE_BYTES) {
    throw new Error("Image is too large. Maximum size is 15 MB.");
  }
}

function validateAudioFile(file: File): void {
  assertSupportedAudioFile(file);
  if (file.size > SOCIAL_MAX_AUDIO_BYTES) {
    throw new Error("Audio is too large. Maximum size is 15 MB.");
  }
}

export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read audio duration."));
    };
    audio.src = url;
  });
}

function validateVideoFile(file: File): void {
  if (!resolveVideoContentType(file)) {
    throw new Error("Unsupported video type. Use MP4, MOV, or WebM.");
  }
  if (file.size > SOCIAL_MAX_VIDEO_BYTES) {
    throw new Error(`Video is too large. Maximum size is ${SOCIAL_MAX_VIDEO_MB} MB.`);
  }
}

/** True when the file exceeds the GigaSocial video byte cap. */
export function isSocialVideoOverSizeLimit(file: Pick<File, "size">): boolean {
  return file.size > SOCIAL_MAX_VIDEO_BYTES;
}

/**
 * Read duration for a local video. Android-safe wrapper around readSocialVideoDuration.
 * Prefer passing `{ signal }` when the user may replace the selection mid-probe.
 */
export function getVideoDuration(
  file: File,
  options?: ReadVideoDurationOptions
): Promise<number> {
  return readSocialVideoDuration(file, options);
}

export { isUsableVideoDuration, readSocialVideoDuration };

export async function generateVideoThumbnail(file: File): Promise<string | undefined> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(
        () => reject(new Error("Could not load video for thumbnail.")),
        10000
      );
      video.onloadeddata = () => {
        window.clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("Could not load video for thumbnail."));
      };
      video.src = url;
      try {
        video.load();
      } catch {
        /* ignore */
      }
    });
    const probe = isUsableVideoDuration(video.duration) ? video.duration : 1;
    video.currentTime = Math.min(1, Math.max(0.05, probe * 0.1));
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => resolve(), 2000);
      video.onseeked = () => {
        window.clearTimeout(timer);
        resolve();
      };
    });
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function throwIfUploadAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");
}

const UPLOAD_IDLE_TIMEOUT_MS = 60_000;

export async function waitForSocialRequest<T>(
  request: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
  signal?: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      cleanup();
      reject(new DOMException("Upload cancelled.", "AbortError"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(timeoutMessage));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    };
    request.then(
      (value) => { cleanup(); resolve(value); },
      (error: unknown) => { cleanup(); reject(error); }
    );
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}

async function uploadWithProgress(
  uploadUrl: string,
  body: BodyInit,
  contentType: string,
  onProgress?: (progress: SocialUploadProgress) => void,
  signal?: AbortSignal,
  headers?: Record<string, string>,
  method: "POST" | "PUT" = "POST"
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    for (const [key, value] of Object.entries(headers ?? {})) {
      xhr.setRequestHeader(key, value);
    }
    let idleTimer: ReturnType<typeof setTimeout>;
    const onSignalAbort = () => xhr.abort();
    const cleanup = () => {
      clearTimeout(idleTimer);
      signal?.removeEventListener("abort", onSignalAbort);
    };
    const refreshIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        cleanup();
        reject(new Error("Upload stalled. Check your connection and try again."));
        xhr.abort();
      }, UPLOAD_IDLE_TIMEOUT_MS);
    };
    xhr.upload.onprogress = (event) => {
      refreshIdleTimer();
      if (!event.lengthComputable || !event.total) return;
      onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
      });
    };
    xhr.onload = () => {
      cleanup();
      resolve(
        new Response(xhr.responseText || null, {
          status: xhr.status,
          statusText: xhr.statusText,
        })
      );
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error("Upload failed. Check your connection and try again."));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("Upload cancelled.", "AbortError"));
    };
    if (signal?.aborted) {
      reject(new DOMException("Upload cancelled.", "AbortError"));
      return;
    }
    signal?.addEventListener("abort", onSignalAbort, { once: true });
    if (signal?.aborted) {
      xhr.abort();
      return;
    }
    try {
      refreshIdleTimer();
      xhr.send(body as XMLHttpRequestBodyInit);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

async function tryDirectSupabaseUpload(args: {
  bucket:
    | (typeof SOCIAL_IMAGE_BUCKETS)[number]
    | (typeof SOCIAL_VIDEO_BUCKETS)[number]
    | (typeof SOCIAL_AVATAR_BUCKETS)[number];
  objectPath: string;
  body: BodyInit;
  contentType: string;
  signal?: AbortSignal;
}): Promise<string | null> {
  if (args.signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");
  if (!isSupabaseConfigured() || !getSupabaseAccessToken()) return null;
  try {
    return await uploadSupabaseStorageObject({
      bucket: args.bucket,
      objectPath: args.objectPath,
      body: args.body,
      contentType: args.contentType,
      signal: args.signal,
    });
  } catch (error) {
    if (args.signal?.aborted) throw error;
    return null;
  }
}

async function getSupabaseUserId(client: SupabaseRestClient): Promise<string | null> {
  const token = getSupabaseAccessToken();
  if (!token) return null;
  try {
    const { user } = await client.authGetUser(token);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function uploadViaPrepared(
  deps: SocialMediaUploadDeps,
  args: {
    file: File;
    kind: "image" | "video" | "audio";
    onProgress?: (progress: SocialUploadProgress) => void;
    signal?: AbortSignal;
    durationSec?: number;
    thumbnailUrl?: string;
    filterId?: string;
  }
): Promise<SocialPostMediaItemInput> {
  const contentType =
    args.kind === "audio"
      ? assertSupportedAudioFile(args.file)
      : args.kind === "video"
        ? resolveVideoContentType(args.file) ?? "video/mp4"
        : resolveImageContentType(args.file) ?? "application/octet-stream";
  throwIfUploadAborted(args.signal);
  const prepared = await waitForSocialRequest(deps.prepareUpload({
    sessionToken: deps.sessionToken,
    fileName: args.file.name,
    contentType,
    sizeBytes: args.file.size,
    kind: args.kind,
  }), 30_000, "Could not prepare the upload. Please try again.", args.signal);

  if (prepared.provider === "supabase") {
    const res = await uploadWithProgress(
      prepared.uploadUrl,
      args.file,
      contentType || prepared.contentType,
      args.onProgress,
      args.signal,
      {
        "x-upsert": "false",
      },
      "PUT"
    );
    if (!res.ok) {
      throw new Error("Upload failed. Please try again.");
    }
    return {
      url: prepared.publicUrl,
      type: args.kind,
      durationSec: args.durationSec,
      thumbnailUrl: args.thumbnailUrl,
      storagePath: prepared.objectPath,
      storageBucket: prepared.bucket,
      filterId: args.filterId,
    };
  }

  const res = await uploadWithProgress(
    prepared.uploadUrl,
    args.file,
    prepared.contentType,
    args.onProgress,
    args.signal
  );
  if (!res.ok) {
    throw new Error("Upload failed. Please try again.");
  }
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
  const { url } = await waitForSocialRequest(deps.resolveStorageUrl({
    sessionToken: deps.sessionToken,
    storageId,
  }), 30_000, "Could not confirm the uploaded file. Please try again.", args.signal);
  return {
    url,
    type: args.kind,
    durationSec: args.durationSec,
    thumbnailUrl: args.thumbnailUrl,
    filterId: args.filterId,
  };
}

export async function uploadSocialImages(
  deps: SocialMediaUploadDeps,
  files: File[],
  options?: {
    filterId?: string;
    onProgress?: (index: number, progress: SocialUploadProgress) => void;
    signal?: AbortSignal;
    /** Faster mobile uploads — smaller bytes over the wire. */
    fastCompress?: boolean;
  }
): Promise<SocialPostMediaItemInput[]> {
  if (!files.length) return [];
  if (files.length > SOCIAL_MAX_PHOTOS_PER_POST) {
    throw new Error(`You can attach up to ${SOCIAL_MAX_PHOTOS_PER_POST} photos per post.`);
  }

  throwIfUploadAborted(options?.signal);
  const client = isSupabaseConfigured() ? requireSupabaseClient() : null;
  const supabaseUid = client ? await waitForSocialRequest(getSupabaseUserId(client), 20_000, "Could not confirm upload account. Try again.", options?.signal).catch(error => { if (options?.signal?.aborted) throw error; return null; }) : null;
  const compressOpts = options?.fastCompress
    ? { maxDimension: 1280, quality: 0.72, maxBytes: SOCIAL_MAX_IMAGE_BYTES }
    : { maxDimension: 1440, quality: 0.78, maxBytes: SOCIAL_MAX_IMAGE_BYTES };

  const controller = new AbortController();
  const abort = () => controller.abort();
  options?.signal?.addEventListener("abort", abort, { once: true });
  if (options?.signal?.aborted) abort();
  const signal = controller.signal;
  const uploadOne = async (file: File, index: number): Promise<SocialPostMediaItemInput> => {
    throwIfUploadAborted(signal);
    validateImageFile(file);
    const compressed = await compressImageFile(file, compressOpts);
    throwIfUploadAborted(signal);

    if (client && supabaseUid) {
      const objectPath = buildUserStoragePath(supabaseUid, file.name);
      const bucket = SOCIAL_IMAGE_BUCKETS[0];
      const directUrl = await tryDirectSupabaseUpload({
        bucket,
        objectPath,
        body: compressed.blob,
        contentType: compressed.mimeType,
        signal,
      });
      if (directUrl) {
        options?.onProgress?.(index, { loaded: 1, total: 1, percent: 100 });
        return {
          url: directUrl,
          type: "image",
          storagePath: objectPath,
          storageBucket: bucket,
          filterId: options?.filterId,
        };
      }
    }

    return uploadViaPrepared(deps, {
      file: new File([compressed.blob], file.name, { type: compressed.mimeType }),
      kind: "image",
      filterId: options?.filterId,
      onProgress: (progress) => options?.onProgress?.(index, progress),
      signal,
    });
  };

  // Keep memory and network contention bounded on mobile.
  const concurrency = Math.min(2, files.length);
  const results: SocialPostMediaItemInput[] = new Array(files.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < files.length && !signal.aborted) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await uploadOne(files[index], index);
    }
  }

  let firstError: unknown;
  try {
    await Promise.allSettled(Array.from({ length: concurrency }, async () => {
      try { await worker(); } catch (error) { if (firstError === undefined) firstError = error; controller.abort(); }
    }));
    if (firstError !== undefined) throw firstError;
    throwIfUploadAborted(signal);
    return results;
  } finally {
    options?.signal?.removeEventListener("abort", abort);
  }
}

export async function uploadSocialVideo(
  deps: SocialMediaUploadDeps,
  file: File,
  options?: {
    onProgress?: (progress: SocialUploadProgress) => void;
    signal?: AbortSignal;
    /** Already verified when the user selected this video in the composer. */
    durationSec?: number;
  }
): Promise<SocialPostMediaItemInput> {
  validateVideoFile(file);
  const durationSec = isUsableVideoDuration(options?.durationSec ?? NaN)
    ? options!.durationSec!
    : await getVideoDuration(file, { signal: options?.signal });
  if (options?.signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");
  if (durationSec > SOCIAL_MAX_VIDEO_DURATION_SEC) {
    throw new Error(
      `Videos must be ${SOCIAL_MAX_VIDEO_DURATION_SEC} seconds or shorter. This video is ${Math.ceil(durationSec)} seconds.`
    );
  }
  if (!isUsableVideoDuration(durationSec)) {
    throw new Error("Could not verify video duration. Try another file.");
  }

  return uploadViaPrepared(deps, {
    file,
    kind: "video",
    durationSec,
    onProgress: options?.onProgress,
    signal: options?.signal,
  });
}

export async function uploadSocialAudio(
  deps: SocialMediaUploadDeps,
  file: File,
  options?: {
    onProgress?: (progress: SocialUploadProgress) => void;
    signal?: AbortSignal;
    /** Photo+music posts cap at 15s; longer clips are trimmed client-side. */
    maxDurationSec?: number;
  }
): Promise<SocialPostMediaItemInput> {
  const maxDurationSec = options?.maxDurationSec ?? SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC;
  const prepared =
    maxDurationSec <= SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC
      ? await prepareAudioForPhotoPost(file, maxDurationSec)
      : { file, durationSec: await getAudioDuration(file), trimmed: false };

  validateAudioFile(prepared.file);
  const durationSec = prepared.durationSec;
  if (maxDurationSec > SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC && durationSec > SOCIAL_MAX_AUDIO_DURATION_SEC) {
    throw new Error(
      `Music tracks must be ${SOCIAL_MAX_AUDIO_DURATION_SEC / 60} minutes or shorter.`
    );
  }
  if (durationSec <= 0) {
    throw new Error("Could not verify audio duration. Try another file.");
  }

  const contentType = assertSupportedAudioFile(prepared.file);
  const client = isSupabaseConfigured() ? requireSupabaseClient() : null;
  const supabaseUid = client ? await getSupabaseUserId(client) : null;

  if (client && supabaseUid) {
    const objectPath = buildUserStoragePath(supabaseUid, prepared.file.name);
    const bucket = SOCIAL_AUDIO_BUCKETS[0];
    const directUrl = await tryDirectSupabaseUpload({
      bucket,
      objectPath,
      body: prepared.file,
      contentType,
    });
    if (directUrl) {
      options?.onProgress?.({ loaded: 1, total: 1, percent: 100 });
      return {
        url: directUrl,
        type: "audio",
        durationSec,
        storagePath: objectPath,
        storageBucket: bucket,
      };
    }
  }

  return uploadViaPrepared(deps, {
    file: prepared.file,
    kind: "audio",
    durationSec,
    onProgress: options?.onProgress,
    signal: options?.signal,
  });
}

export type SocialAvatarUploadDeps = {
  prepareAvatarUpload: (args: {
    sessionToken: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  }) => Promise<PrepareUploadResult>;
  resolveStorageUrl: SocialMediaUploadDeps["resolveStorageUrl"];
  sessionToken: string;
};

export async function uploadSocialAvatar(
  deps: SocialAvatarUploadDeps,
  file: File,
  options?: {
    onProgress?: (progress: SocialUploadProgress) => void;
    signal?: AbortSignal;
  }
): Promise<string> {
  const resolvedImageContentType = resolveImageContentType(file);
  if (!resolvedImageContentType) {
    throw new Error("Unsupported image type. Use JPG, PNG, or WEBP.");
  }
  if (file.size > SOCIAL_MAX_AVATAR_BYTES) {
    throw new Error("Avatar is too large. Maximum size is 2 MB.");
  }

  const compressed = await compressImageFile(file, {
    maxDimension: 512,
    quality: 0.88,
    maxBytes: SOCIAL_MAX_AVATAR_BYTES,
  });

  const client = isSupabaseConfigured() ? requireSupabaseClient() : null;
  const supabaseUid = client ? await getSupabaseUserId(client) : null;

  if (client && supabaseUid) {
    const objectPath = `${cleanSegment(supabaseUid)}/avatar-${Date.now()}-${cleanSegment(file.name)}`;
    const bucket = SOCIAL_AVATAR_BUCKETS[0];
    const directUrl = await tryDirectSupabaseUpload({
      bucket,
      objectPath,
      body: compressed.blob,
      contentType: compressed.mimeType,
    });
    if (directUrl) {
      options?.onProgress?.({ loaded: 1, total: 1, percent: 100 });
      return directUrl;
    }
  }

  const prepared = await deps.prepareAvatarUpload({
    sessionToken: deps.sessionToken,
    fileName: file.name,
    contentType: resolvedImageContentType,
    sizeBytes: compressed.blob.size,
  });

  if (prepared.provider === "supabase") {
    const res = await uploadWithProgress(
      prepared.uploadUrl,
      compressed.blob,
      compressed.mimeType,
      options?.onProgress,
      options?.signal,
      {
        "x-upsert": "true",
      },
      "PUT"
    );
    if (!res.ok) throw new Error("Avatar upload failed. Please try again.");
    return prepared.publicUrl;
  }

  const res = await uploadWithProgress(
    prepared.uploadUrl,
    new File([compressed.blob], file.name, { type: compressed.mimeType }),
    prepared.contentType,
    options?.onProgress,
    options?.signal
  );
  if (!res.ok) throw new Error("Avatar upload failed. Please try again.");
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
  const { url } = await deps.resolveStorageUrl({
    sessionToken: deps.sessionToken,
    storageId,
  });
  return url;
}

function cleanSegment(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9._@-]+/g, "-");
}
