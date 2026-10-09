/**
 * GigaLearn six-area navigation with legacy ?tab= backward compatibility.
 */
import { isLowerGradeCurriculumLevel } from "@/lib/gigalearn/levels";
import type { GigaLearnPrimaryArea } from "@/lib/gigalearn/sections";

/** Legacy tab ids from bookmarks and deep links — mapped to primary areas. */
export const LEGACY_TAB_ALIASES: Record<string, GigaLearnPrimaryArea> = {
  homework: "student",
  learn: "student",
  library: "student",
  "my-learning": "student",
  revision: "student",
  rhymes: "create",
  workspace: "insight",
  insights: "insight",
  studio: "teacher",
};

export type StudentSubView =
  | "home"
  | "learn"
  | "revision"
  | "library"
  | "homework"
  | "early-years"
  | "discover";
export type TeacherSubView = "studio" | "tools";
export type CreateSubView = "studio" | "rhymes";
export type InsightSubView = "progress" | "teacher";

export function resolvePrimaryArea(tab: string | null | undefined): GigaLearnPrimaryArea {
  if (!tab) return "student";
  if (tab in LEGACY_TAB_ALIASES) return LEGACY_TAB_ALIASES[tab]!;
  const primary = tab as GigaLearnPrimaryArea;
  if (
    primary === "student" ||
    primary === "teacher" ||
    primary === "create" ||
    primary === "parent" ||
    primary === "insight" ||
    primary === "tutor"
  ) {
    return primary;
  }
  return "student";
}

export function studentSubViewFromTab(tab: string | null | undefined): StudentSubView {
  switch (tab) {
    case "learn":
      return "learn";
    case "revision":
      return "revision";
    case "library":
      return "library";
    case "homework":
      return "homework";
    case "early-years":
      return "early-years";
    case "discover":
      return "discover";
    case "my-learning":
      return "home";
    default:
      return "early-years";
  }
}

/** Default Student sub-view when no ?tab= — Early years for Creche–P3, My path for upper grades. */
export function resolveStudentSubView(
  tab: string | null | undefined,
  levelId?: string | null
): StudentSubView {
  if (tab) return studentSubViewFromTab(tab);
  if (isLowerGradeCurriculumLevel(levelId)) return "early-years";
  return "home";
}

export function teacherSubViewFromTab(tab: string | null | undefined): TeacherSubView {
  return tab === "studio" || tab === "teacher" ? "studio" : "tools";
}

export function createSubViewFromTab(tab: string | null | undefined): CreateSubView {
  return tab === "rhymes" ? "rhymes" : "studio";
}

export function insightSubViewFromTab(tab: string | null | undefined): InsightSubView {
  return tab === "insights" ? "teacher" : "progress";
}

/** Canonical ?tab= value for URL when selecting a primary area (clean URLs). */
export function tabParamForArea(area: GigaLearnPrimaryArea): string {
  return area;
}
