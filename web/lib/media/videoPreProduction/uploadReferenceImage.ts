import { compressImageFile } from "@/lib/chat/imageCompress";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import type { ConvexReactClient } from "convex/react";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

type PrepareResult =
  | {
      provider: "supabase";
      uploadUrl: string;
      uploadToken: string;
      publicUrl: string;
      contentType: string;
    }
  | {
      provider: "convex";
      uploadUrl: string;
      contentType: string;
    };

async function uploadPrepared(
  prepared: PrepareResult,
  file: File
): Promise<string> {
  if (prepared.provider === "supabase") {
    const res = await fetch(prepared.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || prepared.contentType,
        Authorization: `Bearer ${prepared.uploadToken}`,
        "x-upsert": "false",
      },
      body: file,
    });
    if (!res.ok) throw new Error("Image upload failed.");
    return prepared.publicUrl;
  }

  const res = await fetch(prepared.uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || prepared.contentType },
    body: file,
  });
  if (!res.ok) throw new Error("Image upload failed.");
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
  return storageId;
}

/** Upload a local image and return a public HTTPS URL for video generation. */
export async function uploadPreProductionReferenceImage(
  convex: ConvexReactClient,
  file: File
): Promise<string> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error("Sign in to upload images.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG, or WEBP).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large. Maximum size is 15 MB.");
  }

  const compressed = await compressImageFile(file, {
    maxDimension: 1440,
    quality: 0.82,
    maxBytes: MAX_IMAGE_BYTES,
  });
  const uploadFile = new File([compressed.blob], file.name, {
    type: compressed.mimeType,
  });

  const prepared = (await convex.action(api.gigaSocialStorage.prepareMediaUpload, {
    sessionToken,
    fileName: uploadFile.name,
    contentType: uploadFile.type,
    sizeBytes: uploadFile.size,
    kind: "image",
  })) as PrepareResult;

  const storageOrUrl = await uploadPrepared(prepared, uploadFile);

  if (prepared.provider === "supabase") {
    return storageOrUrl;
  }

  const { url } = await convex.mutation(api.gigaSocialStorage.resolveStorageUrl, {
    sessionToken,
    storageId: storageOrUrl as Id<"_storage">,
  });
  return url;
}
