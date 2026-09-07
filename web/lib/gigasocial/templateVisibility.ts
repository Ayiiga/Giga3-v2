import type { SocialPost } from "@/lib/gigasocial/types";

/** Client-side prefilter before opening the template studio. Server still enforces eligibility. */
export function canShowTemplateButton(post: SocialPost, viewerUserId: string | null): boolean {
  const isOwner = Boolean(viewerUserId && post.author.userId === viewerUserId);
  if (isOwner) return true;
  const policy = post.templatePolicy ?? "off";
  if (policy === "off" || policy === "owner") return false;
  return true;
}
