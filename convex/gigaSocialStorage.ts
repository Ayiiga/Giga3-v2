import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { requireSession } from "./auth";
import { sanitizeHttpHeaderValue } from "./sanitizeHttpHeader";
import { assertSafeUploadFileName } from "./uploadSecurity";
import { sessionArgs } from "./validators";

const SOCIAL_IMAGE_BUCKET = "social-images";
const SOCIAL_VIDEO_BUCKET = "social-videos";
const SOCIAL_AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

type PrepareMediaUploadResult =
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

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function cleanSegment(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9._@-]+/g, "-");
}

function buildSocialObjectPath(userId: string, fileName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${cleanSegment(userId)}/${date}/${Date.now()}-${cleanSegment(fileName)}`;
}

const AUDIO_MIME = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/webm",
  "audio/x-caf",
]);

const AUDIO_MIME_ALIASES: Record<string, string> = {
  "audio/mp3": "audio/mpeg",
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/x-aac": "audio/aac",
  "audio/x-caf": "audio/x-caf",
};

const AUDIO_EXT_TO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
  webm: "audio/webm",
  caf: "audio/x-caf",
};

const SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC = 15;

function normalizeAudioContentType(contentType: string, fileName?: string): string {
  const raw = contentType?.toLowerCase().split(";")[0].trim();
  if (raw && AUDIO_MIME.has(raw)) return raw;
  if (raw && AUDIO_MIME_ALIASES[raw]) return AUDIO_MIME_ALIASES[raw];
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext && AUDIO_EXT_TO_MIME[ext]) return AUDIO_EXT_TO_MIME[ext];
  return raw;
}

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const SOCIAL_AUDIO_BUCKET = "social-audio";

function validateMimeAndSize(
  contentType: string,
  sizeBytes: number,
  kind: "image" | "video" | "audio",
  fileName?: string
): void {
  if (kind === "image") {
    if (!IMAGE_MIME.has(contentType)) {
      throw new Error("Unsupported image type. Use JPG, PNG, or WEBP.");
    }
    if (sizeBytes > MAX_IMAGE_BYTES) {
      throw new Error("Image is too large. Maximum size is 15 MB.");
    }
    return;
  }
  if (kind === "audio") {
    const normalized = normalizeAudioContentType(contentType, fileName);
    if (!AUDIO_MIME.has(normalized)) {
      throw new Error("Unsupported audio type. Use MP3, M4A, WAV, or OGG.");
    }
    if (sizeBytes > MAX_AUDIO_BYTES) {
      throw new Error("Audio is too large. Maximum size is 15 MB.");
    }
    return;
  }
  if (!VIDEO_MIME.has(contentType)) {
    throw new Error("Unsupported video type. Use MP4, MOV, or WebM.");
  }
  if (sizeBytes > MAX_VIDEO_BYTES) {
    throw new Error("Video is too large. Maximum size is 100 MB.");
  }
}

/** Convex file storage fallback when Supabase signed upload is unavailable. */
export const generateUploadUrl = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    await requireSession(args.sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Prepare a Supabase signed upload URL (service role) or Convex upload URL fallback.
 * Client uploads directly, then passes resulting URLs to createPost.
 */
export const prepareMediaUpload = action({
  args: {
    sessionToken: v.string(),
    fileName: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
    kind: v.union(v.literal("image"), v.literal("video"), v.literal("audio")),
  },
  handler: async (ctx, args): Promise<PrepareMediaUploadResult> => {
    const userId = await requireSession(args.sessionToken);
    const safeName = assertSafeUploadFileName(args.fileName);
    validateMimeAndSize(args.contentType, args.sizeBytes, args.kind, safeName);

    const bucket =
      args.kind === "image"
        ? SOCIAL_IMAGE_BUCKET
        : args.kind === "video"
          ? SOCIAL_VIDEO_BUCKET
          : SOCIAL_AUDIO_BUCKET;
    const objectPath = buildSocialObjectPath(userId, safeName);

    const baseUrl = process.env.SUPABASE_URL?.trim()?.replace(/\/$/, "");
    const serviceKey = sanitizeHttpHeaderValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (baseUrl && serviceKey) {
      try {
        const signRes = await fetch(
          `${baseUrl}/storage/v1/object/upload/sign/${bucket}/${objectPath}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ expiresIn: 3600 }),
          }
        );

        if (signRes.ok) {
          const signed = (await signRes.json()) as {
            url?: string;
            token?: string;
            path?: string;
          };
          if (signed.url && signed.token) {
            const publicUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
            return {
              provider: "supabase" as const,
              bucket,
              objectPath,
              uploadUrl: signed.url,
              uploadToken: signed.token,
              publicUrl,
              contentType: args.contentType,
            };
          }
        }
      } catch {
        /* Supabase unreachable — fall through to Convex storage */
      }
    }

    const convexUploadUrl: string = await ctx.runMutation(api.gigaSocialStorage.generateUploadUrl, {
      sessionToken: args.sessionToken,
    });
    return {
      provider: "convex" as const,
      uploadUrl: convexUploadUrl,
      objectPath,
      contentType: args.contentType,
    };
  },
});

/** Prepare avatar upload (Supabase avatars bucket or Convex fallback). */
export const prepareAvatarUpload = action({
  args: {
    sessionToken: v.string(),
    fileName: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args): Promise<PrepareMediaUploadResult> => {
    const userId = await requireSession(args.sessionToken);
    const safeName = assertSafeUploadFileName(args.fileName);
    validateMimeAndSize(args.contentType, args.sizeBytes, "image", safeName);
    if (args.sizeBytes > MAX_AVATAR_BYTES) {
      throw new Error("Avatar image is too large. Maximum size is 2 MB.");
    }

    const bucket = SOCIAL_AVATAR_BUCKET;
    const objectPath = `${cleanSegment(userId)}/avatar-${Date.now()}-${cleanSegment(safeName)}`;

    const baseUrl = process.env.SUPABASE_URL?.trim()?.replace(/\/$/, "");
    const serviceKey = sanitizeHttpHeaderValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (baseUrl && serviceKey) {
      try {
        const signRes = await fetch(
          `${baseUrl}/storage/v1/object/upload/sign/${bucket}/${objectPath}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ expiresIn: 3600 }),
          }
        );

        if (signRes.ok) {
          const signed = (await signRes.json()) as {
            url?: string;
            token?: string;
          };
          if (signed.url && signed.token) {
            const publicUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
            return {
              provider: "supabase" as const,
              bucket,
              objectPath,
              uploadUrl: signed.url,
              uploadToken: signed.token,
              publicUrl,
              contentType: args.contentType,
            };
          }
        }
      } catch {
        /* fall through */
      }
    }

    const convexUploadUrl: string = await ctx.runMutation(api.gigaSocialStorage.generateUploadUrl, {
      sessionToken: args.sessionToken,
    });
    return {
      provider: "convex" as const,
      uploadUrl: convexUploadUrl,
      objectPath,
      contentType: args.contentType,
    };
  },
});

/** Resolve Convex storage IDs to public URLs after client upload. */
export const resolveStorageUrl = mutation({
  args: {
    sessionToken: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireSession(args.sessionToken);
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Uploaded file is not available.");
    return { url };
  },
});
