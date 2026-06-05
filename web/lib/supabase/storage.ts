"use client";

import { requireSupabaseClient, type SupabaseStorageBucket } from "@/lib/supabase";

export const SUPABASE_STORAGE_BUCKETS = {
  images: "images",
  videos: "videos",
  avatars: "avatars",
  uploads: "uploads",
} as const satisfies Record<SupabaseStorageBucket, SupabaseStorageBucket>;

function cleanSegment(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export function buildUserStoragePath(userId: string, fileName: string): string {
  return `${cleanSegment(userId)}/${Date.now()}-${cleanSegment(fileName)}`;
}

export function getSupabasePublicStorageUrl(
  bucket: Exclude<SupabaseStorageBucket, "uploads">,
  objectPath: string
): string {
  return requireSupabaseClient().storagePublicUrl(bucket, objectPath);
}

export async function uploadSupabaseStorageObject(args: {
  bucket: SupabaseStorageBucket;
  objectPath: string;
  body: BodyInit;
  contentType?: string;
  upsert?: boolean;
}): Promise<string | null> {
  await requireSupabaseClient().storageUpload(args.bucket, args.objectPath, args.body, {
    contentType: args.contentType,
    upsert: args.upsert,
  });
  return args.bucket === "uploads"
    ? null
    : requireSupabaseClient().storagePublicUrl(args.bucket, args.objectPath);
}

export async function removeSupabaseStorageObjects(
  bucket: SupabaseStorageBucket,
  objectPaths: string[]
): Promise<void> {
  if (!objectPaths.length) return;
  await requireSupabaseClient().storageRemove(bucket, objectPaths);
}

