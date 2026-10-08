import type {
  LearningMediaItem,
  MediaContentType,
  MediaDiscoverCategory,
  MediaLanguageCode,
} from "@/lib/gigalearn/mediaLibrary/types";
import type { GigaLearnLevelId } from "@/lib/gigalearn/levels";

export type MediaLibraryFilters = {
  category?: MediaDiscoverCategory | "all";
  level?: GigaLearnLevelId | "all";
  subject?: string | "all";
  topic?: string | "all";
  language?: MediaLanguageCode | "all";
  contentType?: MediaContentType | "all";
  query?: string;
};

export function filterMediaLibrary(
  items: LearningMediaItem[],
  filters: MediaLibraryFilters
): LearningMediaItem[] {
  const q = filters.query?.trim().toLowerCase() ?? "";
  return items.filter((item) => {
    if (
      filters.category &&
      filters.category !== "all" &&
      filters.category !== "offline" &&
      item.discoverCategory !== filters.category
    ) {
      return false;
    }
    if (filters.level && filters.level !== "all" && !item.levels.includes(filters.level)) {
      return false;
    }
    if (filters.subject && filters.subject !== "all" && item.subject !== filters.subject) {
      return false;
    }
    if (filters.topic && filters.topic !== "all" && item.topic !== filters.topic) {
      return false;
    }
    if (
      filters.language &&
      filters.language !== "all" &&
      !item.languages.includes(filters.language)
    ) {
      return false;
    }
    if (
      filters.contentType &&
      filters.contentType !== "all" &&
      item.contentType !== filters.contentType
    ) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      item.title,
      item.description,
      item.subject,
      item.topic,
      item.culturalTheme ?? "",
      item.countryCode ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function uniqueSubjects(items: LearningMediaItem[]): string[] {
  return [...new Set(items.map((i) => i.subject))].sort();
}

export function uniqueTopics(items: LearningMediaItem[]): string[] {
  return [...new Set(items.map((i) => i.topic))].sort();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
