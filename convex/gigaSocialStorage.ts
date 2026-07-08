import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { requireSession } from "./auth";
import { sanitizeHttpHeaderValue } from "./sanitizeHttpHeader";
import { sessionArgs } from "./validators";

const SOCIAL_IMAGE_BUCKET = "social-images";
const SOCIAL_VIDEO_BUCKET = "social-videos";

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

function validateMimeAndSize(
  contentType: string,
  sizeBytes: number,
  kind: "image" | "video"
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
    kind: v.union(v.literal("image"), v.literal("video")),
  },
  handler: async (ctx, args): Promise<PrepareMediaUploadResult> => {
    const userId = await requireSession(args.sessionToken);
    validateMimeAndSize(args.contentType, args.sizeBytes, args.kind);

    const bucket =
      args.kind === "image" ? SOCIAL_IMAGE_BUCKET : SOCIAL_VIDEO_BUCKET;
    const objectPath = buildSocialObjectPath(userId, args.fileName);

    const baseUrl = process.env.SUPABASE_URL?.trim()?.replace(/\/$/, "");
    const serviceKey = sanitizeHttpHeaderValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (baseUrl && serviceKey) {
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
