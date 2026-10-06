"use client";

import { AdaptiveTutor } from "@/components/gigalearn/AdaptiveTutor";
import { memo } from "react";

interface TutorHubProps {
  credits: number | null;
}

export const TutorHub = memo(function TutorHub({ credits }: TutorHubProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">AI Tutor</h2>
        <p className="mt-1 text-sm text-muted">
          Ask questions, get explanations, hints, practice and correction — using your curriculum context.
        </p>
      </div>
      <AdaptiveTutor credits={credits} />
    </div>
  );
});
