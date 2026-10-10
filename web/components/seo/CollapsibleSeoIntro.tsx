"use client";

import { useId, useState } from "react";

type CollapsibleSeoIntroProps = {
  description: string;
  detail?: string;
  bodyClass: string;
};

/**
 * Compact product intro with Read more / Read less.
 * Full copy stays in the DOM for SEO and assistive tech; collapse is visual.
 */
export function CollapsibleSeoIntro({
  description,
  detail,
  bodyClass,
}: CollapsibleSeoIntroProps) {
  const [expanded, setExpanded] = useState(false);
  const regionId = useId();

  return (
    <div className="mt-1.5">
      <div id={regionId}>
        <p className={`${bodyClass} ${expanded ? "" : "line-clamp-2"}`.trim()}>
          {description}
        </p>
        {detail ? (
          <p
            className={
              expanded ? "mt-2 text-sm leading-6 text-muted" : "sr-only"
            }
          >
            {detail}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="mt-1 inline-flex min-h-10 items-center rounded-md text-sm font-medium text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? "Read less" : "Read more"}
      </button>
    </div>
  );
}
