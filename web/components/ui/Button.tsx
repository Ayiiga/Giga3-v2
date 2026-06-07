import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "image" | "video";
type Size = "sm" | "md" | "lg";

const baseStyles =
  "inline-flex touch-target items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground shadow-btn-primary hover:bg-accent/90",
  secondary:
    "border border-border bg-white text-foreground shadow-subtle hover:border-zinc-300 hover:bg-zinc-50",
  ghost: "text-foreground hover:bg-zinc-100",
  outline:
    "border border-zinc-300 text-foreground hover:border-accent hover:bg-accent-subtle",
  image:
    "bg-btn-image text-white shadow-btn-image hover:brightness-105",
  video:
    "bg-btn-video text-white shadow-btn-video hover:brightness-105",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-4 py-2 text-sm",
  md: "min-h-11 px-5 py-2.5 text-base",
  lg: "min-h-12 px-6 py-3 text-base",
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
