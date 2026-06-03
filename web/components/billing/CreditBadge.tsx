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
        "inline-flex items-center gap-2 rounded-full border border-blue-500/35 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-200",
        className
      )}
    >
      <Coins className="app-icon" aria-hidden />
      {showLabel && <span>{credits} credits</span>}
      {!showLabel && <span>{credits}</span>}
    </span>
  );
}
