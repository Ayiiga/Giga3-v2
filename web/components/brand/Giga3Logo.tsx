import { cn } from "@/lib/utils";

type Giga3LogoProps = {
  size?: number;
  className?: string;
  /** Pass "" when the logo sits next to visible brand text. */
  "aria-label"?: string;
};

/** Violet gradient mark with embossed white G — recognizable at 24px+. */
export function Giga3Logo({ size = 32, className, "aria-label": ariaLabel }: Giga3LogoProps) {
  const fontSize = Math.round(size * 0.625);
  return (
    <div
      role="img"
      aria-label={ariaLabel ?? "Giga3 AI"}
      className={cn(
        "giga3-logo relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[12px]",
        "bg-gradient-to-br from-[#6D28D9] to-[#7C3AED] shadow-[0_0_20px_rgba(124,58,237,0.4)]",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2",
        "before:bg-gradient-to-b before:from-white/20 before:to-transparent",
        className
      )}
      style={{ width: size, height: size }}
    >
      <span
        className="relative z-[1] font-black leading-none tracking-tight text-white"
        style={{ fontSize }}
        aria-hidden
      >
        G
      </span>
    </div>
  );
}
