"use client";

import { useId, useState } from "react";

type CollapsibleSeoIntroProps = {
  description: string;
  detail?: string;
  bodyClass: string;
  /** Visible when collapsed (default: Read more). */
  expandLabel?: string;
  /** Visible when expanded (default: Read less). */
  collapseLabel?: string;
};

/**
 * Compact product intro with Learn more / Read more style toggle.
 * Full copy stays in the DOM for SEO and assistive tech; collapse is visual.
 */
export function CollapsibleSeoIntro({
  description,
  detail,
  bodyClass,
  expandLabel = "Read more",
  collapseLabel = "Read less",
}: CollapsibleSeoIntroProps) {
  const [expanded, setExpanded] = useState(false);
  const regionId = useId();

  return (
    <div className="mt-1">
      <div id={regionId}>
        <p className={`${bodyClass} ${expanded ? "" : "line-clamp-2"}`.trim()}>
          {description}
        </p>
        {detail ? (
          <p
            className={
              expanded ? "mt-1.5 text-sm leading-6 text-muted" : "sr-only"
            }
          >
            {detail}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="mt-0.5 inline-flex min-h-10 items-center rounded-md text-sm font-medium text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? collapseLabel : expandLabel}
      </button>
    </div>
  );
}
