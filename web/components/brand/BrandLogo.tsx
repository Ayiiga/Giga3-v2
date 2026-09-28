import { Giga3Logo } from "@/components/brand/Giga3Logo";
import { branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  /** Pass "" when the logo sits next to visible brand text (avoids redundant alt). */
  alt?: string;
};

/** Giga3 AI mark — violet gradient G (PWA icons via `npm run generate:branding`). */
export function BrandLogo({ size = 36, className, alt }: BrandLogoProps) {
  return (
    <Giga3Logo
      size={size}
      className={cn(className)}
      aria-label={alt === "" ? "" : alt ?? branding.name}
    />
  );
}
