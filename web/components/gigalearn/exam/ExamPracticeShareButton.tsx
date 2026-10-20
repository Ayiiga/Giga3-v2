"use client";

import {
  examPracticeShareUrl,
  shareExamPractice,
  type ExamPracticeShareKind,
} from "@/lib/gigalearn/examPractice/sharePractice";
import { cn } from "@/lib/utils";
import { Share2 } from "lucide-react";
import { useState } from "react";

type Props = {
  kind: ExamPracticeShareKind;
  className?: string;
  label?: string;
};

export function ExamPracticeShareButton({
  kind,
  className,
  label = "Share practice",
}: Props) {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className={cn("space-y-1", className)}>
      <button
        type="button"
        className="exam-landing-cta exam-landing-cta--ghost inline-flex min-h-11 w-full items-center justify-center gap-2"
        data-testid={`exam-share-${kind}`}
        onClick={() => {
          void shareExamPractice(kind).then((result) => {
            if (result === "shared") setStatus("Thanks for sharing!");
            else if (result === "copied") setStatus("Link copied — paste anywhere to share.");
            else setStatus(`Copy this link: ${examPracticeShareUrl(kind)}`);
          });
        }}
      >
        <Share2 className="h-4 w-4" aria-hidden />
        {label}
      </button>
      {status ? (
        <p className="text-xs text-slate-500" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
