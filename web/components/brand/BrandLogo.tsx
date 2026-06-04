import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/** Giga3 AI mark — replace `public/images/logo.png` with your official asset if needed. */
export function BrandLogo({ size = 36, className, priority }: BrandLogoProps) {
  return (
    <Image
      src="/images/logo.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-xl object-cover", className)}
    />
  );
}
