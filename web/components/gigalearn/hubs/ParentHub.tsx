"use client";

import { GigaLearnToolPanel } from "@/components/gigalearn/GigaLearnToolPanel";
import { PARENT_TOOLS } from "@/lib/gigalearn/tools";
import { memo } from "react";

interface ParentHubProps {
  credits: number | null;
}

export const ParentHub = memo(function ParentHub({ credits }: ParentHubProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Parent</h2>
        <p className="mt-1 text-sm text-muted">
          Understand what your child is learning and how to support them at home.
        </p>
      </div>

      <GigaLearnToolPanel tools={PARENT_TOOLS} credits={credits} />

      <div className="rounded-2xl border border-dashed border-border bg-zinc-50/50 p-4 text-sm text-muted">
        <p className="font-medium text-foreground">Learner profiles &amp; home progress</p>
        <p className="mt-1 text-xs">
          Multi-child profiles and shared home dashboards will connect here. For now, use Insight
          for activity on this device and Parent tools for summaries and tips.
        </p>
      </div>
    </div>
  );
});
