"use client";

import { CV_ACCENTS, CV_LAYOUTS, type CvLayout } from "@/lib/documents/cvLayouts";
import { useState, type CSSProperties } from "react";

const FILTERS = ["All", "Professional", "Modern"] as const;

export function CvTemplateGallery({ onChoose }: { onChoose: (layout: CvLayout) => void }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  return (
    <section aria-labelledby="cv-template-heading" className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/40 p-3 sm:p-5">
      <h3 id="cv-template-heading" className="text-lg font-bold text-foreground">Choose a CV layout</h3>
      <div aria-label="CV template categories" role="group" className="flex flex-wrap gap-1.5">
        {FILTERS.map((category) => (
          <button key={category} type="button" aria-pressed={category === filter} onClick={() => setFilter(category)}
            className="min-h-11 rounded-xl border border-border bg-white px-3 text-xs font-semibold text-slate-700 aria-pressed:border-violet-700 aria-pressed:bg-violet-700 aria-pressed:text-white">
            {category}
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {(Object.keys(CV_LAYOUTS) as CvLayout[]).filter((id) => filter === "All" || CV_LAYOUTS[id].category === filter).map((id) => {
          const layout = CV_LAYOUTS[id];
          return (
            <li key={id} className="min-w-0">
              <button type="button" onClick={() => onChoose(id)}
                className="group flex h-full w-full flex-col gap-2 rounded-xl border border-violet-200 bg-white p-2 text-left hover:border-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600">
                <div aria-hidden="true" data-cv-treatment={layout.treatment}
                  className="cv-paper cv-paper-sample aspect-[210/297] w-full overflow-hidden rounded-sm border border-slate-200 bg-white p-2 text-slate-700"
                  style={{ "--cv-accent": id === "signature" ? CV_ACCENTS.Navy : CV_ACCENTS.Slate } as CSSProperties}>
                  <h1>Jordan Taylor</h1>
                  <p>Project Coordinator · Accra</p>
                  <h2>Profile</h2>
                  <p>Organises projects and supports teams through clear communication.</p>
                  <h2>Experience</h2>
                  <p><strong>Project Coordinator</strong><br />Managed schedules and prepared reports.</p>
                  <h2>Education</h2>
                  <p>Bachelor of Business Administration</p>
                  <h2>Skills</h2>
                  <p>Planning · Reporting · Communication</p>
                </div>
                <span className="text-sm font-bold text-slate-900">{layout.name}</span>
                <span className="text-xs text-slate-600">{layout.description}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
