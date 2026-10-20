/**
 * Home continuity helpers — device-local resume signals + greeting copy.
 * No fabricated trends; only surface items when real local/session data exists.
 */

import { listDocumentDrafts } from "@/lib/documents/drafts";
import { loadPracticeSession } from "@/lib/gigalearn/practiceSessionStorage";
import { listSavedPrompts, type SavedPrompt } from "@/lib/chat/savedPrompts";
import { getLocalPersonalizedRecommendations } from "@/lib/trends/personalizedRecommendations";

export type HomeResumeItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  kind: "learn" | "create" | "document" | "tool";
};

export type HomeDestination = {
  id: string;
  label: string;
  href: string;
  description: string;
};

/** Education-first destinations — optional cross-links, never forced. */
export const HOME_DESTINATIONS: HomeDestination[] = [
  {
    id: "home",
    label: "AI Assistant",
    href: "/chat",
    description: "Chat, writing, research, and coding",
  },
  {
    id: "learn",
    label: "Academy",
    href: "/gigalearn/academy/",
    description: "Courses, tutoring, and certificates",
  },
  {
    id: "practice",
    label: "Exam Practice",
    href: "/gigalearn/exam/",
    description: "BECE, Teacher Promotion, and more",
  },
  {
    id: "social",
    label: "Social",
    href: "/gigasocial",
    description: "Creators and community",
  },
  {
    id: "market",
    label: "Market",
    href: "/marketplace",
    description: "Ebooks and learning materials",
  },
];

export function greetingNameFromEmail(email: string | null | undefined): string | null {
  if (!email || !email.includes("@")) return null;
  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) return null;
  const cleaned = local.replace(/[._+-]+/g, " ").replace(/\d+/g, " ").trim();
  const first = cleaned.split(/\s+/).find((p) => p.length >= 2);
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function buildHomeGreeting(args: {
  email?: string | null;
  hour?: number;
}): { title: string; subtitle: string } {
  const name = greetingNameFromEmail(args.email);
  const hour = args.hour ?? new Date().getHours();
  const timeWord =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const title = name ? `${timeWord}, ${name}` : `${timeWord}`;
  return {
    title,
    subtitle: "Ask anything — or pick up where you left off.",
  };
}

/**
 * Sync resume cards from device storage (privacy-safe, no extra API calls).
 * GigaEdit IndexedDB projects are loaded separately (async).
 */
export function listSyncHomeResumeItems(limit = 4): HomeResumeItem[] {
  if (typeof window === "undefined") return [];
  const items: HomeResumeItem[] = [];

  const practice = loadPracticeSession();
  if (practice && !practice.finished) {
    const answered = Object.keys(practice.answers ?? {}).length;
    const total = practice.questions.length;
    items.push({
      id: `practice-${practice.toolId}-${practice.startedAt}`,
      label: "Resume practice",
      detail: `${practice.toolId} · ${answered}/${total} answered`,
      href: "/gigalearn",
      kind: "learn",
    });
  }

  const draft = listDocumentDrafts()[0];
  if (draft) {
    items.push({
      id: `doc-${draft.id}`,
      label: draft.title?.trim() || "Untitled document",
      detail: "Document draft on this device",
      href: "/documents",
      kind: "document",
    });
  }

  for (const rec of getLocalPersonalizedRecommendations(3)) {
    if (rec.reason === "Based on your recent activity") {
      items.push({
        id: rec.id,
        label: rec.title,
        detail: rec.reason,
        href: rec.href,
        kind: "tool",
      });
    }
  }

  return items.slice(0, limit);
}

/** User-saved prompts only (excludes built-in defaults with createdAt 0). */
export function listUserSavedPrompts(limit = 3): SavedPrompt[] {
  return listSavedPrompts()
    .filter((p) => p.createdAt > 0)
    .slice(0, limit);
}

export function homeQuickActionStarter(
  action: "learn" | "research" | "create" | "code"
): string {
  switch (action) {
    case "learn":
      return "Help me learn about ";
    case "research":
      return "Research this with clear sources: ";
    case "create":
      return "Help me create ";
    case "code":
      return "Help me write code for ";
    default:
      return "";
  }
}
