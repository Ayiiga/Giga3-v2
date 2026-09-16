import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type IconProps = {
  active?: boolean;
  className?: string;
};

const STROKE = 2;

function IconSvg({
  className,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-[1.35rem] w-[1.35rem] shrink-0", className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Home — AI chat bubble with spark */
export function HomeNavIcon({ active, className }: IconProps) {
  const stroke = active ? 2.15 : STROKE;
  return (
    <IconSvg className={className}>
      <path
        d="M5.5 6.25h11.75a2.25 2.25 0 0 1 2.25 2.25v6.5a2.25 2.25 0 0 1-2.25 2.25H11.2l-3.45 2.95v-2.95H5.5a2.25 2.25 0 0 1-2.25-2.25v-6.5a2.25 2.25 0 0 1 2.25-2.25Z"
        fill="currentColor"
        fillOpacity={active ? 0.18 : 0.12}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="M8.25 10.25h6.75M8.25 13.25h4.25"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        d="M16.75 4.1 17.55 5.75 19.35 5.2 18.05 6.55 19.35 7.9 17.55 7.35 16.75 9 15.95 7.35 14.15 7.9 15.45 6.55 14.15 5.2 15.95 5.75 16.75 4.1Z"
        fill="#f59e0b"
        stroke="none"
      />
    </IconSvg>
  );
}

/** Learn — open book with learning spark */
export function LearnNavIcon({ active, className }: IconProps) {
  const stroke = active ? 2.15 : STROKE;
  return (
    <IconSvg className={className}>
      <path
        d="M5.25 6.75A2 2 0 0 1 7.1 5.25H11.75v13.5H7.1A2 2 0 0 1 5.25 16.75V6.75Z"
        fill="currentColor"
        fillOpacity={active ? 0.2 : 0.14}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="M11.75 5.25h5.15A2 2 0 0 1 18.75 7.25v9.5a2 2 0 0 1-2 2H11.75"
        fill="currentColor"
        fillOpacity={active ? 0.1 : 0.06}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="M8 9.25h2.75M8 12h2"
        stroke="currentColor"
        strokeWidth={1.65}
        strokeLinecap="round"
        opacity={0.85}
      />
      <path
        d="M15.1 3.85 15.75 5.2 17.2 4.7 16.15 5.95 17.2 7.2 15.75 6.7 15.1 8.05 14.45 6.7 13 7.2 14.05 5.95 13 4.7 14.45 5.2 15.1 3.85Z"
        fill="#10b981"
        stroke="none"
      />
    </IconSvg>
  );
}

/** Create — magic wand with creative spark */
export function CreateNavIcon({ active, className }: IconProps) {
  const stroke = active ? 2.15 : STROKE;
  return (
    <IconSvg className={className}>
      <path
        d="M4.75 19.25 13.25 10.75"
        stroke="currentColor"
        strokeWidth={stroke + 0.25}
        strokeLinecap="round"
      />
      <path
        d="M12.25 6.75 13.55 5.45a1.65 1.65 0 0 1 2.35 0l.75.75a1.65 1.65 0 0 1 0 2.35l-1.3 1.3"
        fill="currentColor"
        fillOpacity={active ? 0.16 : 0.1}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5.75" cy="18.25" r="1.35" fill="#a855f7" />
      <circle cx="8.75" cy="15.25" r="0.85" fill="#c084fc" opacity={0.9} />
      <path
        d="M17.85 3.65 18.75 5.45 20.55 4.85 19.15 6.35 20.55 7.85 18.75 7.25 17.85 9.05 16.95 7.25 15.15 7.85 16.55 6.35 15.15 4.85 16.95 5.45 17.85 3.65Z"
        fill="#f59e0b"
        stroke="none"
      />
    </IconSvg>
  );
}

/** Social — community + feed */
export function SocialNavIcon({ active, className }: IconProps) {
  const stroke = active ? 2.15 : STROKE;
  return (
    <IconSvg className={className}>
      <circle
        cx="9.25"
        cy="9"
        r="2.65"
        fill="currentColor"
        fillOpacity={active ? 0.18 : 0.12}
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <circle
        cx="16.75"
        cy="9.75"
        r="2.15"
        fill="currentColor"
        fillOpacity={active ? 0.14 : 0.08}
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <path
        d="M4.25 18.75c.95-2.35 2.85-3.75 5-3.75s4.05 1.4 5 3.75"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        d="M14.75 17.75c.55-1.15 1.55-1.85 2.55-1.85 1 0 1.85.55 2.35 1.25"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <rect
        x="3.25"
        y="3.75"
        width="5.75"
        height="4.25"
        rx="1.1"
        fill="#ec4899"
        fillOpacity={active ? 0.22 : 0.16}
        stroke="#ec4899"
        strokeWidth={1.35}
      />
      <path
        d="M4.5 5.35h3.75M4.5 6.65h2.35"
        stroke="#be185d"
        strokeWidth={1.35}
        strokeLinecap="round"
        opacity={0.85}
      />
    </IconSvg>
  );
}
