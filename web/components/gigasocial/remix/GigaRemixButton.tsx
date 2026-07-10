"use client";

import { parseRemixMeta } from "@/lib/gigasocial/remixMeta";
import type { SocialPost } from "@/lib/gigasocial/types";
import { GitBranchPlus } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { buildGigaSocialPostUrl } from "@/lib/gigasocial/shareLinks";

export const GigaRemixBadge = memo(function GigaRemixBadge({ post }: { post: SocialPost }) {
  const remix = parseRemixMeta(post.body);
  if (!remix) return null;
  return (
    <p className="mt-2 text-xs text-muted">
      <GitBranchPlus className="mr-1 inline h-3.5 w-3.5 text-accent" aria-hidden />
      Remix chain ·{" "}
      <Link href={buildGigaSocialPostUrl(remix.sourcePostId)} className="text-accent hover:underline">
        View original
      </Link>
    </p>
  );
});

export const GigaRemixButton = memo(function GigaRemixButton({
  disabled,
  onRemix,
}: {
  disabled?: boolean;
  onRemix: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onRemix}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted hover:bg-accent/5 hover:text-accent disabled:opacity-50"
      aria-label="Remix this post"
    >
      <GitBranchPlus className="h-4 w-4" aria-hidden />
      Remix
    </button>
  );
});
