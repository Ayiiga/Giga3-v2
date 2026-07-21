"use client";

import {
  POST_AI_ACTIONS,
  runPostAIAction,
  type PostAIActionId,
} from "@/lib/gigasocial/aiAssistant";
import type { SocialPost } from "@/lib/gigasocial/types";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Check, Copy, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useState, useTransition } from "react";

type GigaSocialPostAIActionsProps = {
  post: SocialPost;
  compact?: boolean;
  className?: string;
};

function buildStudioHref(action: PostAIActionId, prompt: string): string {
  const encoded = encodeURIComponent(prompt);
  if (action === "generate-short-clip") {
    return `${siteConfig.links.video}?prompt=${encoded}`;
  }
  return `${siteConfig.links.media}?prompt=${encoded}`;
}

export const GigaSocialPostAIActions = memo(function GigaSocialPostAIActions({
  post,
  compact = false,
  className,
}: GigaSocialPostAIActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<PostAIActionId | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const runAction = useCallback(
    (actionId: PostAIActionId) => {
      const def = POST_AI_ACTIONS.find((a) => a.id === actionId);
      startTransition(() => {
        const result = runPostAIAction(actionId, {
          body: post.body,
          postType: post.postType,
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          shareCount: post.shareCount,
          viewCount: post.viewCount,
          hashtags: post.hashtags,
        });
        if (def?.navigates) {
          router.push(buildStudioHref(actionId, result));
          setOpen(false);
          return;
        }
        setActiveId(actionId);
        setSuggestion(result);
        setCopied(false);
      });
    },
    [post, router]
  );

  const copySuggestion = useCallback(async () => {
    if (!suggestion) return;
    try {
      await navigator.clipboard.writeText(suggestion);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [suggestion]);

  return (
    <div className={cn("gigasocial-post-ai", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-medium text-violet-700 hover:bg-violet-50",
          compact ? "min-h-8 px-2 py-1 text-[11px]" : "min-h-9 px-3 py-1.5 text-xs"
        )}
        aria-expanded={open}
        aria-controls={`post-ai-${post._id}`}
      >
        <Sparkles className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
        AI
      </button>

      {open ? (
        <div
          id={`post-ai-${post._id}`}
          className="mt-2 rounded-xl border border-violet-200/80 bg-violet-50/60 p-2"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-violet-900">
              AI suggestions — original post stays unchanged
            </p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSuggestion(null);
              }}
              className="rounded-lg p-1 text-violet-700 hover:bg-white/70"
              aria-label="Close AI tools"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {POST_AI_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={pending}
                title={action.description}
                onClick={() => runAction(action.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  activeId === action.id
                    ? "border-violet-400 bg-white text-violet-900"
                    : "border-violet-200 bg-white/80 text-violet-800 hover:border-violet-300"
                )}
              >
                {action.label}
              </button>
            ))}
          </div>

          {suggestion ? (
            <div className="mt-2 rounded-lg border border-violet-200 bg-white p-2.5">
              <p className="whitespace-pre-wrap text-xs text-foreground">{suggestion}</p>
              <button
                type="button"
                onClick={() => void copySuggestion()}
                className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-full border border-border px-2.5 text-[11px] font-medium text-muted hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                )}
                {copied ? "Copied" : "Copy suggestion"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
