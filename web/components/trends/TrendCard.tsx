import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

type TrendCardProps = {
  title: string;
  description: string;
  href: string;
  badge?: string;
  icon?: ReactNode;
  meta?: string;
  className?: string;
  onNavigate?: () => void;
};

export function TrendCard({
  title,
  description,
  href,
  badge,
  icon,
  meta,
  className,
  onNavigate,
}: TrendCardProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "saas-card group block rounded-2xl p-5 transition-colors hover:border-accent/30",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground group-hover:text-accent">{title}</h3>
            {badge ? (
              <span className="rounded-full border border-accent/20 bg-accent/5 px-2 py-0.5 text-[10px] font-medium text-accent">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
          {meta ? <p className="mt-2 text-xs text-muted">{meta}</p> : null}
        </div>
      </div>
    </Link>
  );
}
