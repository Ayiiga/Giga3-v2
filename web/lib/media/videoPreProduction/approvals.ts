import type { VideoPreProductionDraft } from "@/lib/media/videoPreProduction/types";

/** Script or idea edits must invalidate downstream approvals before video generation. */
export function invalidateApprovalsOnScriptChange(): Pick<
  VideoPreProductionDraft,
  "scriptApproved" | "voiceoverApproved"
> {
  return { scriptApproved: false, voiceoverApproved: false };
}
