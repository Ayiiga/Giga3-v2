"use client";

import { MediaItemPlayer } from "@/components/gigalearn/discover/MediaItemPlayer";
import { MEDIA_LIBRARY_CATALOG } from "@/lib/gigalearn/mediaLibrary/catalog";
import {
  filterMediaLibrary,
  formatBytes,
  uniqueSubjects,
  uniqueTopics,
} from "@/lib/gigalearn/mediaLibrary/filters";
import {
  getOfflineMediaStorageSummary,
  listOfflineMediaPacks,
} from "@/lib/gigalearn/mediaLibrary/offlineMedia";
import {
  DISCOVER_CATEGORIES,
  LANGUAGE_LABELS,
  type LearningMediaItem,
  type MediaDiscoverCategory,
  type MediaLanguageCode,
  type OfflineMediaPack,
} from "@/lib/gigalearn/mediaLibrary/types";
import { LOWER_GRADE_LEVELS, type GigaLearnLevelId } from "@/lib/gigalearn/levels";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

type DiscoverHubProps = {
  /** Prefer studio context level when available. */
  preferredLevel?: string | null;
};

export function DiscoverHub({ preferredLevel }: DiscoverHubProps) {
  const initialLevel =
    preferredLevel && (LOWER_GRADE_LEVELS as string[]).includes(preferredLevel)
      ? (preferredLevel as GigaLearnLevelId)
      : "KG2";

  const [category, setCategory] = useState<MediaDiscoverCategory | "all">("all");
  const [level, setLevel] = useState<GigaLearnLevelId | "all">(initialLevel);
  const [subject, setSubject] = useState<string | "all">("all");
  const [topic, setTopic] = useState<string | "all">("all");
  const [language, setLanguage] = useState<MediaLanguageCode | "all">("all");
  const [activeItem, setActiveItem] = useState<LearningMediaItem | null>(null);
  const [offlinePacks, setOfflinePacks] = useState<OfflineMediaPack[]>([]);
  const [storageLabel, setStorageLabel] = useState("No offline media yet");

  const refreshOffline = useCallback(async () => {
    const packs = await listOfflineMediaPacks();
    setOfflinePacks(packs);
    const summary = await getOfflineMediaStorageSummary();
    setStorageLabel(
      summary.packCount === 0
        ? "No offline media yet"
        : `${summary.readyCount} ready · ${formatBytes(summary.bytesStored)} on device`
    );
  }, []);

  useEffect(() => {
    void refreshOffline();
  }, [refreshOffline]);

  const subjects = useMemo(() => uniqueSubjects(MEDIA_LIBRARY_CATALOG), []);
  const topics = useMemo(() => uniqueTopics(MEDIA_LIBRARY_CATALOG), []);

  const filtered = useMemo(() => {
    if (category === "offline") return [];
    return filterMediaLibrary(MEDIA_LIBRARY_CATALOG, {
      category,
      level,
      subject,
      topic,
      language,
    });
  }, [category, level, subject, topic, language]);

  const offlineItems = useMemo(() => {
    return offlinePacks
      .filter((pack) => pack.status === "ready")
      .map((pack) => pack.item)
      .filter((item) => {
        if (level !== "all" && !item.levels.includes(level)) return false;
        if (language !== "all" && !item.languages.includes(language)) return false;
        return true;
      });
  }, [offlinePacks, level, language]);

  const list = category === "offline" ? offlineItems : filtered;

  if (activeItem) {
    return (
      <MediaItemPlayer
        item={activeItem}
        onClose={() => setActiveItem(null)}
        onOfflineChange={() => void refreshOffline()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Discover</h3>
        <p className="mt-1 text-sm text-muted">
          Videos, pictures, rhymes, games and Ghana culture — save packs for offline learning.
        </p>
        <p className="mt-1 text-xs font-medium text-accent">📴 {storageLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {DISCOVER_CATEGORIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setCategory(entry.id)}
            className={cn(
              "min-h-[5.5rem] rounded-2xl border px-3 py-3 text-left",
              category === entry.id
                ? "border-accent/50 bg-accent/10"
                : "border-border bg-white hover:border-accent/30"
            )}
          >
            <span className="text-2xl" aria-hidden>
              {entry.emoji}
            </span>
            <span className="mt-1 block text-sm font-semibold text-foreground">{entry.label}</span>
            <span className="mt-0.5 block text-[11px] leading-4 text-muted">
              {entry.description}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="discover-level">
          Grade
        </label>
        <select
          id="discover-level"
          className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
          value={level}
          onChange={(e) => setLevel(e.target.value as GigaLearnLevelId | "all")}
        >
          <option value="all">All grades</option>
          {LOWER_GRADE_LEVELS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <select
          className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-label="Subject"
        >
          <option value="all">All subjects</option>
          {subjects.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          aria-label="Topic"
        >
          <option value="all">All topics</option>
          {topics.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
          value={language}
          onChange={(e) => setLanguage(e.target.value as MediaLanguageCode | "all")}
          aria-label="Language"
        >
          <option value="all">All languages</option>
          {(Object.keys(LANGUAGE_LABELS) as MediaLanguageCode[]).map((code) => (
            <option key={code} value={code}>
              {LANGUAGE_LABELS[code]}
            </option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">
            {category === "offline" ? "No downloads yet" : "No lessons match these filters"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {category === "offline"
              ? "Open a lesson and tap Save for offline."
              : "Try another grade, subject or category."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((item) => {
            const saved = offlinePacks.some(
              (pack) => pack.itemId === item.id && pack.status === "ready"
            );
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActiveItem(item)}
                  className="flex min-h-[5.5rem] w-full items-center gap-3 rounded-2xl border border-border bg-white px-3 py-3 text-left hover:border-accent/35"
                >
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#1a233f] text-3xl"
                    aria-hidden
                  >
                    {item.illustration.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted">
                      {item.description}
                    </span>
                    <span className="mt-1 block text-[11px] font-medium text-accent">
                      {item.levels.join(" · ")}
                      {saved ? " · Offline" : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
