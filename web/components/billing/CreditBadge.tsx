import { cn } from "@/lib/utils";
import { Coins } from "lucide-react";

interface CreditBadgeProps {
  credits: number;
  className?: string;
  showLabel?: boolean;
}

export function CreditBadge({
  credits,
  className,
  showLabel = true,
}: CreditBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-200",
        className
      )}
    >
      <Coins className="h-3.5 w-3.5" aria-hidden />
      {showLabel && <span>{credits} credits</span>}
      {!showLabel && <span>{credits}</span>}
    </span>
  );
}
