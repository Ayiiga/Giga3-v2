"use client";

import { AcademyChrome } from "@/components/gigalearn/academy/AcademyChrome";
import { AcademyCourseCatalogueBody } from "@/components/gigalearn/academy/AcademyCourseCatalogueBody";

/** Dedicated catalogue page — same search/list as the Existing Academy section on home. */
export function AcademyCatalogue() {
  return (
    <AcademyChrome
      active="catalogue"
      title="Course catalogue"
      subtitle="Structured pathways that reuse your existing GigaLearn tools, practice, and media — not a separate curriculum rebuild."
    >
      <AcademyCourseCatalogueBody />
    </AcademyChrome>
  );
}
