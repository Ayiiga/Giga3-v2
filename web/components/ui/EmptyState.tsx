import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
}

/** Consistent empty-state card for lists and panels. */
export function EmptyState({ title, description, icon: Icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "saas-card rounded-2xl border border-dashed border-border p-8 text-center",
        className
      )}
    >
      {Icon ? (
        <Icon className="mx-auto h-8 w-8 text-accent/70" aria-hidden />
      ) : null}
      {title ? (
        <p className={cn("text-sm font-semibold text-foreground", Icon && "mt-3")}>
          {title}
        </p>
      ) : null}
      <p className={cn("text-sm leading-relaxed text-muted", title || Icon ? "mt-1.5" : "")}>
        {description}
      </p>
    </div>
  );
}
