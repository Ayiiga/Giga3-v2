"use client";

import type { UsageSnapshot } from "@/lib/credits/constants";
import {
  chatsRemaining,
  formatLimit,
  imagesRemaining,
} from "@/lib/credits/rules";
import { cn } from "@/lib/utils";
import { MessageSquare, ImageIcon, Video } from "lucide-react";

interface UsageTrackerProps {
  usage: UsageSnapshot;
  className?: string;
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MessageSquare;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function UsageTracker({ usage, className }: UsageTrackerProps) {
  const chatVal = usage.premium
    ? "Unlimited"
    : formatLimit(usage.chatsUsed, usage.chatsLimit);
  const imgVal = usage.premium
    ? `${usage.credits} cr available`
    : formatLimit(usage.imagesUsed, usage.imagesLimit);
  const videoVal = usage.canGenerateVideo ? "Available" : "Premium + credits";

  return (
    <div
      className={cn(
        "glass space-y-3 rounded-xl border border-border p-4",
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Today&apos;s usage
      </p>
      <Row icon={MessageSquare} label="Chats" value={chatVal} />
      <Row icon={ImageIcon} label="Images" value={imgVal} />
      <Row icon={Video} label="Video" value={videoVal} />
      {!usage.premium && chatsRemaining(usage) === 0 && (
        <p className="text-xs text-amber-300">Chat limit reached — upgrade for unlimited.</p>
      )}
    </div>
  );
}
