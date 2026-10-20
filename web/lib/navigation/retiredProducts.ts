/**
 * Phase 2 education-first retirement: dedicated create products hidden from UX.
 * Backend media/video Convex modules and tables are intentionally preserved.
 */

export type RetiredProductId =
  | "media"
  | "video"
  | "gigaedit"
  | "gigaedits"
  | "ai-studio";

export type RetiredProductMeta = {
  id: RetiredProductId;
  /** Public path prefix (no trailing slash). */
  path: string;
  formerName: string;
  summary: string;
};

export const RETIRED_PRODUCTS: readonly RetiredProductMeta[] = [
  {
    id: "media",
    path: "/media",
    formerName: "Media Studio",
    summary:
      "Standalone Media Studio is no longer offered as a dedicated product. Generate and edit images in the AI Assistant when signed in.",
  },
  {
    id: "video",
    path: "/video",
    formerName: "Video AI",
    summary:
      "Standalone Video AI entry points are retired with Media Studio. Ask the AI Assistant for video guidance, or publish on GigaSocial with your own media.",
  },
  {
    id: "gigaedit",
    path: "/gigaedit",
    formerName: "GigaEdit",
    summary:
      "GigaEdit / GigaEdits is no longer a dedicated product. Local drafts on this device are not deleted. Continue creating with AI Assistant, GigaLearn, and GigaSocial.",
  },
  {
    id: "gigaedits",
    path: "/gigaedits",
    formerName: "GigaEdits",
    summary:
      "GigaEdits marketing pages are retired. Use GigaLearn Academy, Exam Practice, the AI Assistant, and GigaSocial instead.",
  },
  {
    id: "ai-studio",
    path: "/ai-studio",
    formerName: "Giga3 AI Studio",
    summary:
      "The AI Studio creative umbrella that pointed at Media Studio and Video AI has been retired. Education and productivity tools remain available.",
  },
] as const;

export function normalizeAppPath(pathname: string): string {
  const withoutQuery = pathname.split("?")[0] ?? "/";
  if (!withoutQuery || withoutQuery === "/") return "/";
  return withoutQuery.endsWith("/") && withoutQuery.length > 1
    ? withoutQuery.slice(0, -1)
    : withoutQuery;
}

export function getRetiredProduct(pathname: string): RetiredProductMeta | null {
  const path = normalizeAppPath(pathname);
  return (
    RETIRED_PRODUCTS.find(
      (p) => path === p.path || path.startsWith(`${p.path}/`)
    ) ?? null
  );
}

export function isRetiredProductPath(pathname: string): boolean {
  return getRetiredProduct(pathname) != null;
}

/** Safe destinations shown on retirement pages (education-first). */
export const EDUCATION_FIRST_DESTINATIONS = [
  {
    href: "/gigalearn/academy/",
    label: "GigaLearn Academy",
    description: "Courses, enrolments, tutoring, and certificates",
  },
  {
    href: "/gigalearn/exam/",
    label: "Exam Practice",
    description: "BECE, Teacher Promotion, and subject practice",
  },
  {
    href: "/chat/",
    label: "AI Assistant",
    description: "Chat, writing, research, coding, and in-chat images",
  },
  {
    href: "/gigalearn/academy/tech/",
    label: "Technology Learning Hub",
    description: "Interactive technology practice banks",
  },
  {
    href: "/gigasocial/",
    label: "GigaSocial",
    description: "Community feed and publishing",
  },
  {
    href: "/marketplace/",
    label: "Marketplace",
    description: "Ebooks, learning materials, and digital products",
  },
] as const;
