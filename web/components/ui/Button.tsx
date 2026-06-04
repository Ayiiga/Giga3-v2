import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "image" | "video";
type Size = "sm" | "md" | "lg";

const baseStyles =
  "inline-flex items-center justify-center gap-2.5 rounded-xl font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 pointer-fine:active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary:
    "bg-btn-primary text-white shadow-btn-primary hover:brightness-110 hover:shadow-[0_14px_32px_-8px_rgba(37,99,235,0.6)]",
  secondary:
    "border-2 border-zinc-300 bg-white font-bold text-foreground shadow-sm hover:border-zinc-400 hover:bg-zinc-50",
  ghost: "font-semibold text-foreground hover:bg-zinc-100",
  outline:
    "border-2 border-zinc-400 font-bold text-foreground hover:border-violet-500 hover:bg-violet-50",
  image:
    "bg-btn-image text-white shadow-btn-image hover:brightness-110 hover:shadow-[0_14px_32px_-8px_rgba(16,185,129,0.5)]",
  video:
    "bg-btn-video text-white shadow-btn-video hover:brightness-110 hover:shadow-[0_14px_32px_-8px_rgba(239,68,68,0.5)]",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-5 py-2 text-sm",
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
