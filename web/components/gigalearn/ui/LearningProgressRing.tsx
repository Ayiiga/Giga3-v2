"use client";

/**
 * Decorative circular progress for real learner percentages (0–100).
 * Presentation only — callers must pass server/session-verified values.
 */
export function LearningProgressRing({
  percent,
  size = 72,
  stroke = 7,
  trackClassName = "stroke-[color-mix(in_srgb,currentColor_16%,transparent)]",
  progressClassName = "stroke-current",
  label,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  trackClassName?: string;
  progressClassName?: string;
  label?: string;
}) {
  const clamped = Number.isFinite(percent)
    ? Math.max(0, Math.min(100, Math.round(percent)))
    : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center text-[#16A34A]"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${clamped}% complete`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          className={trackClassName}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className={progressClassName}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums text-[#1E1B4B]">
        {clamped}%
      </span>
    </div>
  );
}
