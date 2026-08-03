import type { ExportAspectRatio } from "@/lib/gigaedit/types";

export type GigaEditPublishDestination =
  | "feed"
  | "reel"
  | "story"
  | "draft"
  | "device"
  | "external";

export type GigaEditPublishPrivacy =
  | "public_reusable"
  | "public_no_reuse"
  | "followers"
  | "private";

export type GigaEditPublishMediaKind = "video" | "photo";

export type GigaEditAudioMixMode = "original" | "mute" | "replace" | "mix";

export type GigaEditPublishPackageMeta = {
  id: string;
  kind: GigaEditPublishMediaKind;
  projectId?: string;
  fileName: string;
  mimeType: string;
  aspectRatio: ExportAspectRatio;
  durationSec?: number;
  caption?: string;
  privacy: GigaEditPublishPrivacy;
  allowSoundReuse: boolean;
  soundId?: string;
  soundTitle?: string;
  audioMixMode: GigaEditAudioMixMode;
  aiAssisted: boolean;
  createdAt: number;
  /** Destination chosen on the publish screen (for composer seeding). */
  destination?: GigaEditPublishDestination;
};

export type GigaEditPublishHandoff = GigaEditPublishPackageMeta & {
  /** IndexedDB keys for blobs — never stored in sessionStorage. */
  editedBlobKey: string;
  originalBlobKey: string;
  audioBlobKey?: string;
};

export function privacyToSocialVisibility(
  privacy: GigaEditPublishPrivacy
): "public" | "followers" | null {
  if (privacy === "private") return null;
  if (privacy === "followers") return "followers";
  return "public";
}

export function destinationComposerSeed(destination: GigaEditPublishDestination): {
  action: "text-post" | "story-content" | "media-camera";
  body: string;
  postType: "video" | "image" | "text";
} {
  switch (destination) {
    case "reel":
      return {
        action: "text-post",
        body: "🎬 Reel\n\n#reel #gigaedit",
        postType: "video",
      };
    case "story":
      return {
        action: "story-content",
        body: "✨ Story\n\n#story #gigaedit",
        postType: "video",
      };
    case "feed":
    default:
      return {
        action: "text-post",
        body: "",
        postType: "video",
      };
  }
}
