import Image from "next/image";
import { brandingAssetUrl } from "@/lib/brandingAssets";
import { branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/** Giga3 AI mark — generated via `npm run generate:branding`. */
export function BrandLogo({ size = 36, className, priority }: BrandLogoProps) {
  return (
    <Image
      src={brandingAssetUrl("/images/logo.png")}
      alt={branding.name}
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-xl object-cover", className)}
    />
  );
}
