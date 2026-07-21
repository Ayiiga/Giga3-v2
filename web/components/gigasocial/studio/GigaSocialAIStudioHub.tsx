"use client";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";
import { X } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

export type AIStudioToolId =
  | "ai-studio"
  | "teleprompter"
  | "script-generator"
  | "thumbnail-maker"
  | "caption-generator"
  | "background-remover"
  | "video-editor"
  | "logo-maker"
  | "brand-kit"
  | "voice-studio"
  | "music-generator"
  | "template-library"
  | "analytics"
  | "publishing-scheduler";

export type AIStudioTool = {
  id: AIStudioToolId;
  label: string;
  emoji: string;
  description: string;
};

export const AI_STUDIO_TOOLS: AIStudioTool[] = [
  {
    id: "teleprompter",
    label: "Teleprompter",
    emoji: "📜",
    description: "Scroll scripts while you record",
  },
  {
    id: "script-generator",
    label: "Script Generator",
    emoji: "🧠",
    description: "Draft talking points for your next video",
  },
  {
    id: "thumbnail-maker",
    label: "Thumbnail Maker",
    emoji: "🖼",
    description: "Generate click-worthy thumbnails",
  },
  {
    id: "caption-generator",
    label: "Caption Generator",
    emoji: "✍️",
    description: "Hooks, CTAs, and hashtags",
  },
  {
    id: "background-remover",
    label: "Background Remover",
    emoji: "✂️",
    description: "Clean product and portrait shots",
  },
  {
    id: "video-editor",
    label: "Video Editor",
    emoji: "🎬",
    description: "Trim and polish before posting",
  },
  {
    id: "logo-maker",
    label: "Logo Maker",
    emoji: "◈",
    description: "Quick brand marks with AI",
  },
  {
    id: "brand-kit",
    label: "Brand Kit",
    emoji: "🎨",
    description: "Colors, fonts, and cover templates",
  },
  {
    id: "voice-studio",
    label: "Voice Studio",
    emoji: "🎙",
    description: "Voiceover ideas in chat",
  },
  {
    id: "music-generator",
    label: "Music Generator",
    emoji: "🎵",
    description: "Bed tracks for Reels and Stories",
  },
  {
    id: "template-library",
    label: "Template Library",
    emoji: "📚",
    description: "Ready-made creator templates",
  },
  {
    id: "analytics",
    label: "Analytics",
    emoji: "📊",
    description: "Open your Creator Dashboard",
  },
  {
    id: "publishing-scheduler",
    label: "Publishing Scheduler",
    emoji: "🗓",
    description: "Best-time guidance for posts",
  },
];

export type AIStudioLaunch =
  | { kind: "compose-camera"; teleprompter?: boolean; body?: string }
  | { kind: "navigate"; href: string }
  | { kind: "toast"; message: string };

export function resolveAIStudioLaunch(toolId: AIStudioToolId): AIStudioLaunch {
  switch (toolId) {
    case "teleprompter":
      return { kind: "compose-camera", teleprompter: true };
    case "script-generator":
      return {
        kind: "compose-camera",
        teleprompter: true,
        body: "Script draft:\n\nHook:\nPoint 1:\nPoint 2:\nCTA:\n",
      };
    case "thumbnail-maker":
    case "background-remover":
    case "logo-maker":
    case "brand-kit":
      return { kind: "navigate", href: siteConfig.links.media };
    case "caption-generator":
      return {
        kind: "navigate",
        href: `${siteConfig.links.dashboard}?category=writing`,
      };
    case "video-editor":
    case "music-generator":
      return { kind: "navigate", href: siteConfig.links.video };
    case "voice-studio":
      return { kind: "navigate", href: siteConfig.links.dashboard };
    case "template-library":
      return { kind: "navigate", href: siteConfig.links.creatorStudio };
    case "analytics":
      return { kind: "navigate", href: "/gigasocial/?tab=creator" };
    case "publishing-scheduler":
      return {
        kind: "toast",
        message: "Best windows: 7–9 AM and 6–8 PM local. Schedule your next post in the composer.",
      };
    case "ai-studio":
    default:
      return { kind: "toast", message: "Pick a tool below to get started." };
  }
}

export const GigaSocialAIStudioHub = memo(function GigaSocialAIStudioHub({
  open,
  onClose,
  onLaunch,
}: {
  open: boolean;
  onClose: () => void;
  onLaunch: (launch: AIStudioLaunch) => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSelect = useCallback(
    (toolId: AIStudioToolId) => {
      const launch = resolveAIStudioLaunch(toolId);
      if (launch.kind === "navigate") {
        router.push(launch.href);
        onClose();
        return;
      }
      onLaunch(launch);
      onClose();
    },
    [onClose, onLaunch, router]
  );

  if (!mounted || !open) return null;

  return createPortal(
    <div className="gigasocial-stable fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close AI Studio"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI Studio"
        className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-border bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">AI Studio</h2>
            <p className="text-xs text-muted">Creator tools — current feed stays open</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-muted/10 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <ul className="grid max-h-[70vh] grid-cols-2 gap-2 overflow-y-auto overscroll-contain p-3">
          {AI_STUDIO_TOOLS.map((tool) => (
            <li key={tool.id}>
              <button
                type="button"
                onClick={() => handleSelect(tool.id)}
                className={cn(
                  "flex h-full min-h-[4.5rem] w-full flex-col items-start rounded-xl border border-border bg-white px-3 py-2.5 text-left",
                  "hover:border-violet-300 hover:bg-violet-50/50 active:scale-[0.99]"
                )}
              >
                <span className="text-base" aria-hidden>
                  {tool.emoji}
                </span>
                <span className="mt-1 text-xs font-semibold text-foreground">{tool.label}</span>
                <span className="mt-0.5 text-[10px] leading-snug text-muted">
                  {tool.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
});
