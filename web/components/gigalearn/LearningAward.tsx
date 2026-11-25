import { Award } from "lucide-react";

export function LearningAward({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="gigalearn-play-award" role="status">
      <Award className="h-8 w-8 shrink-0" aria-hidden />
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm">{detail}</p>
      </div>
    </div>
  );
}
