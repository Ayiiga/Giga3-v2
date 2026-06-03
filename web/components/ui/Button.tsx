import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { forwardRef } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "video"
  | "image";
type Size = "sm" | "md" | "lg";

const baseStyles =
  "inline-flex items-center justify-center gap-2.5 rounded-2xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-6 [&_svg]:min-h-[24px] [&_svg]:min-w-[24px] [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white shadow-md shadow-blue-950/50 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-900/40 focus-visible:ring-blue-400",
  video:
    "bg-red-600 text-white shadow-md shadow-red-950/50 hover:bg-red-500 hover:shadow-lg hover:shadow-red-900/40 focus-visible:ring-red-400",
  image:
    "bg-emerald-600 text-white shadow-md shadow-emerald-950/50 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-900/40 focus-visible:ring-emerald-400",
  secondary:
    "glass text-foreground shadow-sm hover:bg-white/[0.08] hover:shadow-md",
  ghost: "text-muted hover:bg-white/[0.08] hover:text-foreground",
  outline:
    "border-2 border-border bg-black/20 text-foreground shadow-sm hover:border-blue-500/45 hover:bg-white/[0.06] focus-visible:ring-blue-400/60",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-4 py-2 text-sm",
  md: "min-h-12 px-6 py-3 text-base",
  lg: "min-h-14 px-8 py-3.5 text-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

interface ButtonLinkProps {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  external?: boolean;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  external,
}: ButtonLinkProps) {
  const classes = cn(baseStyles, variants[variant], sizes[size], className);

  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
