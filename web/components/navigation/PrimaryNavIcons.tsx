import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type IconProps = {
  active?: boolean;
  className?: string;
};

const STROKE = 1.75;

function IconSvg({
  className,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Home — AI chat bubble with spark accent */
export function HomeNavIcon({ active, className }: IconProps) {
  const stroke = active ? 2 : STROKE;
  return (
    <IconSvg active={active} className={className}>
      <path
        d="M8 10h8M8 14h5"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        d="M6 5.5h12a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H11l-3.5 3v-3H6a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="M17.5 3.5 18.5 5.5 20.5 5 19 6.5 20.5 8 18.5 7.5 17.5 9.5 17 7.5 15 8 16.5 6.5 15 5 17 5.5 17.5 3.5Z"
        fill="currentColor"
        stroke="none"
        opacity={active ? 1 : 0.85}
      />
    </IconSvg>
  );
}

/** GigaLearn — open book with learning spark */
export function LearnNavIcon({ active, className }: IconProps) {
  const stroke = active ? 2 : STROKE;
  return (
    <IconSvg active={active} className={className}>
      <path
        d="M5.5 6.5A2 2 0 0 1 7.5 5H12v14H7.5A2 2 0 0 1 5.5 17V6.5Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="M12 5h4.5A2 2 0 0 1 18.5 7v10a2 2 0 0 1-2 2H12"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="M8.5 9h2.5M8.5 12h2"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        opacity={0.9}
      />
      <path
        d="M15.5 4 16.2 5.6 17.8 5 16.6 6.4 17.8 7.8 16.2 7.2 15.5 8.8 14.8 7.2 13.2 7.8 14.4 6.4 13.2 5 14.8 5.6 15.5 4Z"
        fill="currentColor"
        stroke="none"
        opacity={active ? 1 : 0.8}
      />
    </IconSvg>
  );
}

/** Create — magic wand with creative spark */
export function CreateNavIcon({ active, className }: IconProps) {
  const stroke = active ? 2 : STROKE;
  return (
    <IconSvg active={active} className={className}>
      <path
        d="M4.5 19.5 14 10"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        d="m12.5 6.5 1.5-1.5a1.5 1.5 0 0 1 2.12 0l.88.88a1.5 1.5 0 0 1 0 2.12L15.5 9.5"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 9 8.5 10.5"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        d="M18.5 3.5 19.5 5.5 21.5 5 20 6.5 21.5 8 19.5 7.5 18.5 9.5 18 7.5 16 8 17.5 6.5 16 5 18 5.5 18.5 3.5Z"
        fill="currentColor"
        stroke="none"
        opacity={active ? 1 : 0.85}
      />
      <circle cx="6" cy="18" r="1.25" fill="currentColor" opacity={0.9} />
      <circle cx="9" cy="15" r="0.75" fill="currentColor" opacity={0.7} />
    </IconSvg>
  );
}

/** Social — modern community / feed */
export function SocialNavIcon({ active, className }: IconProps) {
  const stroke = active ? 2 : STROKE;
  return (
    <IconSvg active={active} className={className}>
      <circle cx="9" cy="8.5" r="2.25" stroke="currentColor" strokeWidth={stroke} />
      <circle cx="16.5" cy="9.5" r="1.75" stroke="currentColor" strokeWidth={stroke} />
      <path
        d="M4.5 18.5c.8-2.2 2.6-3.5 4.5-3.5s3.7 1.3 4.5 3.5"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        d="M14.5 17.5c.45-1.1 1.35-1.75 2.25-1.75.75 0 1.45.35 1.95.95"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <rect
        x="3.5"
        y="4"
        width="5.5"
        height="4"
        rx="1"
        stroke="currentColor"
        strokeWidth={stroke}
        opacity={0.55}
      />
      <path
        d="M4.5 5.5h3.5M4.5 7h2"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        opacity={0.55}
      />
    </IconSvg>
  );
}
