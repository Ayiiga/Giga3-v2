import Image from "next/image";
import { brandingAssetUrl } from "@/lib/brandingAssets";
import { branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  /** Pass "" when the logo sits next to visible brand text (avoids redundant alt). */
  alt?: string;
};

/** Giga3 AI mark — generated via `npm run generate:branding`. */
export function BrandLogo({ size = 36, className, priority, alt }: BrandLogoProps) {
  return (
    <Image
      src={brandingAssetUrl("/images/logo.png")}
      alt={alt ?? branding.name}
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-xl object-cover", className)}
    />
  );
}
