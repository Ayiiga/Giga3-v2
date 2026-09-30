/**
 * One-click creator pipeline entry — reuses existing Media Studio, GigaEdit, GigaSocial.
 * Does not run generation itself; builds prompts and deep links.
 */
import { GIGAEDIT_RECORDING_LINKS } from "@/lib/navigation/editsDestinations";
import { handoffAndOpenGigaSocial } from "@/lib/gigaedit/publishHandoff";
import { saveTeleprompterScript } from "@/lib/gigasocial/teleprompterScripts";
import { getConvexUrl } from "@/lib/convex/env";

export type CreatorPipelineStepId =
  | "idea"
  | "script"
  | "storyboard"
  | "generate"
  | "voice"
  | "captions"
  | "edit"
  | "publish";

export const CREATOR_PIPELINE_STEPS: Array<{
  id: CreatorPipelineStepId;
  label: string;
  description: string;
}> = [
  { id: "idea", label: "Idea", description: "Your topic or hook" },
  { id: "script", label: "Script", description: "AI script in Media Studio pre-production" },
  { id: "storyboard", label: "Storyboard", description: "Scene prompts from your script" },
  { id: "generate", label: "Generate", description: "Video AI uses existing credit billing" },
  { id: "voice", label: "Voice", description: "Teleprompter or narration in GigaEdit" },
  { id: "captions", label: "Captions", description: "Edit and caption in GigaEdit" },
  { id: "edit", label: "Edit", description: "Trim, join, polish" },
  { id: "publish", label: "Publish", description: "Share on GigaSocial" },
];

export function buildCreatorPipelineMediaUrl(idea: string): string {
  const prompt = idea.trim();
  const params = new URLSearchParams();
  params.set("tab", "video");
  params.set("mode", "preprod");
  if (prompt) params.set("idea", prompt.slice(0, 500));
  return `/media/?${params.toString()}`;
}

/** Stage script in GigaEdits teleprompter storage and open the recorder. */
export function buildCreatorPipelineTeleprompterUrl(script: string): string {
  const trimmed = script.trim();
  if (trimmed) {
    saveTeleprompterScript(trimmed.slice(0, 6000));
  }
  return GIGAEDIT_RECORDING_LINKS.recordVideo;
}

/** Trusted video URLs for creator → GigaSocial publish (user-owned generation output). */
export function isTrustedCreatorVideoUrl(url: string): boolean {
  if (!url.trim()) return false;
  if (url.startsWith("blob:")) return true;
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://www.giga3ai.com");
    if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
      return true;
    }
    const convexBase = getConvexUrl();
    if (convexBase) {
      const convexOrigin = new URL(convexBase).origin;
      if (parsed.origin === convexOrigin && parsed.pathname.includes("/api/storage/")) {
        return true;
      }
    }
    if (parsed.hostname.endsWith(".convex.cloud") && parsed.pathname.includes("/api/storage/")) {
      return true;
    }
    if (parsed.hostname.endsWith(".convex.site")) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/** Fetch a generated video and hand off to GigaSocial via existing publish IDB flow. */
export async function publishCreatorVideoToGigaSocial(input: {
  videoUrl: string;
  caption?: string;
  durationSec?: number;
}): Promise<{ opened: boolean; queued: boolean; error?: string }> {
  if (!isTrustedCreatorVideoUrl(input.videoUrl)) {
    return { opened: false, queued: false, error: "This video cannot be published from here." };
  }
  const response = await fetch(input.videoUrl).catch(() => null);
  if (!response?.ok) {
    return { opened: false, queued: false, error: "Could not load the generated video." };
  }
  const blob = await response.blob();
  const ext = blob.type.includes("webm") ? "webm" : "mp4";
  const file = new File([blob], `giga3-creator-${Date.now()}.${ext}`, {
    type: blob.type || "video/mp4",
  });
  return handoffAndOpenGigaSocial({
    kind: "video",
    edited: file,
    original: file,
    aspectRatio: "9:16",
    caption: input.caption?.trim() ?? "",
    durationSec: input.durationSec,
    aiAssisted: true,
    destination: "feed",
  });
}

export function starterScriptFromIdea(idea: string, durationSec = 45): string {
  const topic = idea.trim() || "your topic";
  return `Create a ${durationSec}-second video about ${topic}. Include a strong hook, 3 clear scenes, and a call to action.`;
}
