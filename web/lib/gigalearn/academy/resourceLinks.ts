import type { AcademyResourceRef } from "@/lib/gigalearn/academy/types";
import { siteConfig } from "@/lib/site";

/** Map Academy resource refs onto existing GigaLearn deep links (no content duplication). */
export function hrefForAcademyResource(resource: AcademyResourceRef): string {
  const base = siteConfig.links.gigalearn;
  switch (resource.kind) {
    case "gigalearn_tab":
      return `${base}/?tab=${encodeURIComponent(resource.tab)}`;
    case "gigalearn_tool":
      // Tools live inside Student/Teacher hubs — open learn/teacher with context hint.
      if (
        resource.toolId.includes("lesson") ||
        resource.toolId.includes("quiz") ||
        resource.toolId.includes("worksheet") ||
        resource.toolId.includes("assignment")
      ) {
        return `${base}/?tab=teacher`;
      }
      return `${base}/?tab=learn`;
    case "curriculum_subject":
      return `${base}/?tab=learn`;
    case "media_item":
      return `${base}/?tab=discover`;
    case "external":
      return resource.href;
    default:
      return base;
  }
}
