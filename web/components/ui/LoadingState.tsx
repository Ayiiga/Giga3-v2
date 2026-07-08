import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  label?: string;
  className?: string;
  compact?: boolean;
}

/** Consistent loading indicator with screen-reader-friendly status. */
export function LoadingState({
  label = "Loading…",
  className,
  compact = false,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        compact ? "min-h-24" : "min-h-40",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
