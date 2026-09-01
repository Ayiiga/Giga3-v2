"use client";

import { GigaSocialPublicPostRoot } from "@/components/gigasocial/GigaSocialPublicPostClient";

export function GigaSocialPostDetailShell({ postId }: { postId: string }) {
  return <GigaSocialPublicPostRoot initialPostId={postId} />;
}
