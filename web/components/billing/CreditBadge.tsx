import { cn } from "@/lib/utils";
import { Coins } from "lucide-react";
import Link from "next/link";

interface CreditBadgeProps {
  credits: number;
  className?: string;
  showLabel?: boolean;
  /** When false, renders a non-clickable badge (e.g. marketing pages). */
  linkToCredits?: boolean;
}

export function CreditBadge({
  credits,
  className,
  showLabel = true,
  linkToCredits = true,
}: CreditBadgeProps) {
  const content = (
    <>
      <Coins className="h-3.5 w-3.5" aria-hidden />
      {showLabel ? <span>{credits} credits</span> : <span>{credits}</span>}
    </>
  );

  const classes = cn(
    "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium text-accent",
    linkToCredits && "hover:bg-accent/10 hover:border-accent/30",
    className
  );

  if (!linkToCredits) {
    return <span className={classes}>{content}</span>;
  }

  return (
    <Link href="/credits" className={classes} title="View credits and billing">
      {content}
    </Link>
  );
}
