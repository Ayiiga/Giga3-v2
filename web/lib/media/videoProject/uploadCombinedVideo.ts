import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import type { ConvexReactClient } from "convex/react";

async function uploadToConvexStorage(uploadUrl: string, file: File): Promise<Id<"_storage">> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "video/webm" },
    body: file,
  });
  if (!res.ok) {
    throw new Error("Could not upload combined video.");
  }
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
  return storageId;
}

export async function uploadCombinedVideoToGallery(
  convex: ConvexReactClient,
  file: File,
  options: {
    title: string;
    prompt?: string;
    aspectRatio?: string;
    durationSec?: number;
    projectId?: string;
  }
): Promise<{ jobId: Id<"mediaJobs">; outputUrl: string }> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error("Session expired. Please sign in again.");
  }

  const uploadUrl = await convex.mutation(api.gigaSocialStorage.generateUploadUrl, {
    sessionToken,
  });
  const storageId = await uploadToConvexStorage(uploadUrl, file);
  return await convex.mutation(api.mediaQueries.registerCombinedProjectVideo, {
    sessionToken,
    storageId,
    title: options.title,
    prompt: options.prompt,
    aspectRatio: options.aspectRatio,
    durationSec: options.durationSec,
    projectId: options.projectId,
  });
}
