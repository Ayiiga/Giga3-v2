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
import {
  SOCIAL_AVATAR_BUCKETS,
  SOCIAL_IMAGE_BUCKETS,
  SOCIAL_IMAGE_MIME_TYPES,
  SOCIAL_MAX_AVATAR_BYTES,
  SOCIAL_MAX_IMAGE_BYTES,
  SOCIAL_MAX_PHOTOS_PER_POST,
  SOCIAL_MAX_VIDEO_BYTES,
  SOCIAL_MAX_VIDEO_DURATION_SEC,
  SOCIAL_VIDEO_BUCKETS,
  SOCIAL_VIDEO_MIME_TYPES,
  type SocialPostMediaItemInput,
  type SocialUploadProgress,
} from "@/lib/gigasocial/constants";

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
    kind: "image" | "video";
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
  if (!SOCIAL_IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error("Unsupported image type. Use JPG, PNG, or WEBP.");
  }
  if (file.size > SOCIAL_MAX_IMAGE_BYTES) {
    throw new Error("Image is too large. Maximum size is 15 MB.");
  }
}

function validateVideoFile(file: File): void {
  if (!SOCIAL_VIDEO_MIME_TYPES.has(file.type)) {
    throw new Error("Unsupported video type. Use MP4, MOV, or WebM.");
  }
  if (file.size > SOCIAL_MAX_VIDEO_BYTES) {
    throw new Error("Video is too large. Maximum size is 100 MB.");
  }
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video duration."));
    };
    video.src = url;
  });
}

export async function generateVideoThumbnail(file: File): Promise<string | undefined> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Could not load video for thumbnail."));
      video.src = url;
    });
    video.currentTime = Math.min(1, Math.max(0, (video.duration || 1) * 0.1));
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
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

async function uploadWithProgress(
  uploadUrl: string,
  body: BodyInit,
  contentType: string,
  onProgress?: (progress: SocialUploadProgress) => void,
  signal?: AbortSignal,
  headers?: Record<string, string>,
  method: "POST" | "PUT" = "POST"
): Promise<Response> {
  if (!onProgress) {
    return fetch(uploadUrl, {
      method,
      headers: {
        "Content-Type": contentType,
        ...(headers ?? {}),
      },
      body,
      signal,
    });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    for (const [key, value] of Object.entries(headers ?? {})) {
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
      });
    };
    xhr.onload = () => {
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
        })
      );
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(body as XMLHttpRequestBodyInit);
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
}): Promise<string | null> {
  if (!isSupabaseConfigured() || !getSupabaseAccessToken()) return null;
  try {
    return await uploadSupabaseStorageObject({
      bucket: args.bucket,
      objectPath: args.objectPath,
      body: args.body,
      contentType: args.contentType,
    });
  } catch {
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
    kind: "image" | "video";
    onProgress?: (progress: SocialUploadProgress) => void;
    signal?: AbortSignal;
    durationSec?: number;
    thumbnailUrl?: string;
  }
): Promise<SocialPostMediaItemInput> {
  const prepared = await deps.prepareUpload({
    sessionToken: deps.sessionToken,
    fileName: args.file.name,
    contentType: args.file.type,
    sizeBytes: args.file.size,
    kind: args.kind,
  });

  if (prepared.provider === "supabase") {
    const res = await uploadWithProgress(
      prepared.uploadUrl,
      args.file,
      args.file.type || prepared.contentType,
      args.onProgress,
      args.signal,
      {
        Authorization: `Bearer ${prepared.uploadToken}`,
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
  const { url } = await deps.resolveStorageUrl({
    sessionToken: deps.sessionToken,
    storageId,
  });
  return {
    url,
    type: args.kind,
    durationSec: args.durationSec,
    thumbnailUrl: args.thumbnailUrl,
  };
}

export async function uploadSocialImages(
  deps: SocialMediaUploadDeps,
  files: File[],
  options?: {
    onProgress?: (index: number, progress: SocialUploadProgress) => void;
    signal?: AbortSignal;
  }
): Promise<SocialPostMediaItemInput[]> {
  if (!files.length) return [];
  if (files.length > SOCIAL_MAX_PHOTOS_PER_POST) {
    throw new Error(`You can attach up to ${SOCIAL_MAX_PHOTOS_PER_POST} photos per post.`);
  }

  const client = isSupabaseConfigured() ? requireSupabaseClient() : null;
  const supabaseUid = client ? await getSupabaseUserId(client) : null;
  const results: SocialPostMediaItemInput[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    validateImageFile(file);
    const compressed = await compressImageFile(file, {
      maxDimension: 1920,
      quality: 0.86,
      maxBytes: SOCIAL_MAX_IMAGE_BYTES,
    });

    if (client && supabaseUid) {
      const objectPath = buildUserStoragePath(supabaseUid, file.name);
      const bucket = SOCIAL_IMAGE_BUCKETS[0];
      const directUrl = await tryDirectSupabaseUpload({
        bucket,
        objectPath,
        body: compressed.blob,
        contentType: compressed.mimeType,
      });
      if (directUrl) {
        options?.onProgress?.(index, { loaded: 1, total: 1, percent: 100 });
        results.push({
          url: directUrl,
          type: "image",
          storagePath: objectPath,
          storageBucket: bucket,
        });
        continue;
      }
    }

    const uploaded = await uploadViaPrepared(deps, {
      file: new File([compressed.blob], file.name, { type: compressed.mimeType }),
      kind: "image",
      onProgress: (progress) => options?.onProgress?.(index, progress),
      signal: options?.signal,
    });
    results.push(uploaded);
  }

  return results;
}

export async function uploadSocialVideo(
  deps: SocialMediaUploadDeps,
  file: File,
  options?: {
    onProgress?: (progress: SocialUploadProgress) => void;
    signal?: AbortSignal;
  }
): Promise<SocialPostMediaItemInput> {
  validateVideoFile(file);
  const durationSec = await getVideoDuration(file);
  if (durationSec > SOCIAL_MAX_VIDEO_DURATION_SEC) {
    throw new Error(
      `Videos must be ${SOCIAL_MAX_VIDEO_DURATION_SEC} seconds or shorter. This video is ${Math.ceil(durationSec)} seconds.`
    );
  }
  if (durationSec <= 0) {
    throw new Error("Could not verify video duration. Try another file.");
  }

  const thumbnailUrl = await generateVideoThumbnail(file);
  const client = isSupabaseConfigured() ? requireSupabaseClient() : null;
  const supabaseUid = client ? await getSupabaseUserId(client) : null;

  if (client && supabaseUid) {
    const objectPath = buildUserStoragePath(supabaseUid, file.name);
    const bucket = SOCIAL_VIDEO_BUCKETS[0];
    const directUrl = await tryDirectSupabaseUpload({
      bucket,
      objectPath,
      body: file,
      contentType: file.type,
    });
    if (directUrl) {
      options?.onProgress?.({ loaded: 1, total: 1, percent: 100 });
      return {
        url: directUrl,
        type: "video",
        durationSec,
        thumbnailUrl,
        storagePath: objectPath,
        storageBucket: bucket,
      };
    }
  }

  return uploadViaPrepared(deps, {
    file,
    kind: "video",
    durationSec,
    thumbnailUrl,
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
  if (!SOCIAL_IMAGE_MIME_TYPES.has(file.type)) {
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
    contentType: compressed.mimeType,
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
        Authorization: `Bearer ${prepared.uploadToken}`,
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
