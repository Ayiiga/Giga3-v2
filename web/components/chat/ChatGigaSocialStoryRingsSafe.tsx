"use client";

import { ChatGigaSocialStoryRings } from "@/components/chat/ChatGigaSocialStoryRings";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Component, type ReactNode } from "react";

class ChatStoryRingsBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[ChatGigaSocialStoryRings]", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <Link
          href={siteConfig.links.gigasocial}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white ring-2 ring-violet-300 sm:h-10 sm:w-10"
          aria-label="Open GigaSocial community feed"
          title="GigaSocial"
        >
          G
        </Link>
      );
    }
    return this.props.children;
  }
}

export function ChatGigaSocialStoryRingsSafe({
  className,
  compact = true,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <ChatStoryRingsBoundary>
      <ChatGigaSocialStoryRings className={cn(className)} compact={compact} />
    </ChatStoryRingsBoundary>
  );
}
