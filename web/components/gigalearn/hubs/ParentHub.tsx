"use client";

import { GigaLearnToolPanel } from "@/components/gigalearn/GigaLearnToolPanel";
import { WorldActivityGuides } from "@/components/gigalearn/WorldActivityGuides";
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

      <WorldActivityGuides />
      <GigaLearnToolPanel tools={PARENT_TOOLS} credits={credits} />
    </div>
  );
});
