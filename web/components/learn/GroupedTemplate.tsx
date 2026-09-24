"use client";

import { pageOf, type LearnItem } from "../../../convex/learnContent";
import { cn } from "@/lib/utils";
import { useState } from "react";

const CONCRETE_BADGE = "bg-[#3B82F6] text-white";

type GroupedTemplateProps = {
  title: string;
  badge: string;
  items: LearnItem[];
  pageSize?: number;
  hearingId: string | null;
  onHear: (item: LearnItem) => void;
};

/** Paginated concrete-object group. Speech is supplied by the existing GigaLearn hear handler. */
export function GroupedTemplate({
  title,
  badge,
  items,
  pageSize = 6,
  hearingId,
  onHear,
}: GroupedTemplateProps) {
  const [page, setPage] = useState(1);
  const view = pageOf(items, page, pageSize);
  const headingId = `learn-group-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-[24px] border border-[#2A3441] bg-[#1a233f] p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-sm font-bold text-white">
          {title}
        </h3>
        <p className="text-[11px] text-gray-300" aria-live="polite">
          Page {view.page} of {view.pages}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {view.items.map((item) => (
          <li
            key={item.id}
            className="min-w-0 rounded-[20px] border border-[#2A3441] bg-[#1A233A] p-4"
          >
            <span className="text-[32px] leading-none" aria-hidden>
              {item.emoji}
            </span>
            <p className="mt-2 break-words text-sm font-bold text-white">{item.title}</p>
            <p className="break-words text-[11px] text-gray-400">{item.subtitle}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
                  CONCRETE_BADGE
                )}
              >
                {badge}
              </span>
              <button
                type="button"
                aria-label={
                  hearingId === item.id
                    ? `Playing ${item.title}`
                    : `Pronounce ${item.title}. English first.`
                }
                aria-pressed={hearingId === item.id}
                disabled={hearingId === item.id}
                onClick={() => onHear(item)}
                className="inline-flex min-h-11 items-center rounded-full bg-[#EAB308] px-3 text-[11px] font-bold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
              >
                {hearingId === item.id ? "…" : "🔊 Hear"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={view.page <= 1}
          aria-label={`Back in ${title}`}
          className="min-h-11 flex-1 rounded-full border border-[#2A3441] px-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(view.pages, current + 1))}
          disabled={view.page >= view.pages}
          aria-label={`Next in ${title}`}
          className="min-h-11 flex-1 rounded-full bg-[#3B82F6] px-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  );
}
