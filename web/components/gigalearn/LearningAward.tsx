import { Award, Trophy } from "lucide-react";

export function LearningAward({ title, detail, tone }: { title: string; detail: string; tone?: string }) {
  const Icon = tone ? Trophy : Award;
  return (
    <div className="gigalearn-play-award" data-learn-tone={tone} role="status">
      <Icon className="h-8 w-8 shrink-0" aria-hidden />
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm">{detail}</p>
      </div>
    </div>
  );
}
