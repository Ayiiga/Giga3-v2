"use client";

import { MediaItemPlayer } from "@/components/gigalearn/discover/MediaItemPlayer";
import { loadCatalogForCountry } from "@/lib/gigalearn/mediaLibrary/catalog";
import {
  getMediaCountry,
  listAvailableMediaCountries,
  MEDIA_COUNTRY_PROFILES,
} from "@/lib/gigalearn/mediaLibrary/countryRegistry";
import {
  filterMediaLibrary,
  formatBytes,
  uniqueSubjects,
  uniqueTopics,
} from "@/lib/gigalearn/mediaLibrary/filters";
import {
  getOfflineMediaStorageSummary,
  isOfflinePackComplete,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DiscoverHubProps = {
  /** Prefer studio context level chip when available. */
  preferredLevel?: string | null;
  /** Prefer studio context country id (ghana, nigeria, …). */
  preferredCountryId?: string | null;
};

function categoryLabel(id: MediaDiscoverCategory | "all"): string {
  if (id === "all") return "All lessons";
  return DISCOVER_CATEGORIES.find((entry) => entry.id === id)?.label ?? id;
}

function categoryMeta(id: MediaDiscoverCategory | "all") {
  if (id === "all") return { emoji: "📚", label: "All lessons" };
  const entry = DISCOVER_CATEGORIES.find((c) => c.id === id);
  return { emoji: entry?.emoji ?? "📚", label: entry?.label ?? id };
}

function preferReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
}

export function DiscoverHub({
  preferredLevel,
  preferredCountryId,
}: DiscoverHubProps) {
  const availableCountries = useMemo(() => listAvailableMediaCountries(), []);
  const initialCountry =
    preferredCountryId && availableCountries.some((c) => c.id === preferredCountryId)
      ? preferredCountryId
      : availableCountries[0]?.id ?? "ghana";

  const initialLevel =
    preferredLevel && (LOWER_GRADE_LEVELS as string[]).includes(preferredLevel)
      ? (preferredLevel as GigaLearnLevelId)
      : "KG2";

  const [countryId, setCountryId] = useState(initialCountry);
  const [catalog, setCatalog] = useState<LearningMediaItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [category, setCategory] = useState<MediaDiscoverCategory | "all">("all");
  const [level, setLevel] = useState<GigaLearnLevelId | "all">(initialLevel);
  const [subject, setSubject] = useState<string | "all">("all");
  const [topic, setTopic] = useState<string | "all">("all");
  const [language, setLanguage] = useState<MediaLanguageCode | "all">("all");
  const [activeItem, setActiveItem] = useState<LearningMediaItem | null>(null);
  const [offlinePacks, setOfflinePacks] = useState<OfflineMediaPack[]>([]);
  const [storageLabel, setStorageLabel] = useState("No offline media yet");
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const countryProfile = getMediaCountry(countryId);
  const languageOptions = countryProfile?.languages ?? (["en"] as MediaLanguageCode[]);

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

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setActiveItem(null);
    setSubject("all");
    setTopic("all");
    setLanguage("all");
    void loadCatalogForCountry(countryId).then((rows) => {
      if (cancelled) return;
      setCatalog(rows);
      setCatalogLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  const subjects = useMemo(() => uniqueSubjects(catalog), [catalog]);
  const topics = useMemo(() => uniqueTopics(catalog), [catalog]);

  const filtered = useMemo(() => {
    if (category === "offline") return [];
    return filterMediaLibrary(catalog, {
      category,
      countryId,
      level,
      subject,
      topic,
      language,
    });
  }, [catalog, category, countryId, level, subject, topic, language]);

  const offlineItems = useMemo(() => {
    return offlinePacks
      .filter((pack) => isOfflinePackComplete(pack))
      .map((pack) => pack.item)
      .filter((item) => {
        if (item.countryId && item.countryId !== countryId) return false;
        if (level !== "all" && !item.levels.includes(level)) return false;
        if (language !== "all" && !item.languages.includes(language)) return false;
        return true;
      });
  }, [offlinePacks, countryId, level, language]);

  const list = category === "offline" ? offlineItems : filtered;

  function selectCategory(next: MediaDiscoverCategory | "all") {
    setCategory(next);
    // Clear secondary filters so a category tap cannot look like a no-op
    // because an earlier subject/topic filter emptied the list.
    setSubject("all");
    setTopic("all");
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: preferReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  }

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
          Country-aware lessons — Ghana first, ready for West Africa and beyond.
        </p>
        <p className="mt-1 text-xs font-medium text-accent">📴 {storageLabel}</p>
        {countryProfile ? (
          <p className="mt-1 text-xs text-muted">
            {countryProfile.flag} {countryProfile.name} · {countryProfile.note}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="discover-country">
          Country
        </label>
        <select
          id="discover-country"
          className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm font-medium"
          value={countryId}
          onChange={(e) => {
            const next = e.target.value;
            if (!getMediaCountry(next)?.available) return;
            setCountryId(next);
          }}
        >
          {MEDIA_COUNTRY_PROFILES.map((country) => (
            <option key={country.id} value={country.id} disabled={!country.available}>
              {country.flag} {country.name}
              {country.available ? "" : " (coming soon)"}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Grade</p>
        <div className="relative">
          <div
            className="gigalearn-grade-scroll flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
            role="tablist"
            aria-label="Discover grade"
          >
            <button
              type="button"
              role="tab"
              aria-selected={level === "all"}
              onClick={() => setLevel("all")}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-3.5 text-xs font-semibold",
                level === "all"
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-border bg-white text-muted"
              )}
            >
              All grades
            </button>
            {LOWER_GRADE_LEVELS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={level === id}
                onClick={() => setLevel(id)}
                className={cn(
                  "min-h-11 shrink-0 rounded-full border px-3.5 text-xs font-semibold",
                  level === id
                    ? "border-accent bg-accent/15 text-foreground"
                    : "border-border bg-white text-muted"
                )}
              >
                {id}
              </button>
            ))}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--background,#faf8ff)] to-transparent"
            aria-hidden
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Explore</p>
        <div
          className="gigalearn-grade-scroll flex gap-2 overflow-x-auto overscroll-x-contain pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible"
          role="group"
          aria-label="Discover categories"
        >
          <button
            type="button"
            aria-pressed={category === "all"}
            data-testid="discover-category-all"
            onClick={() => selectCategory("all")}
            className={cn(
              "flex min-h-11 min-w-[8.5rem] shrink-0 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left sm:min-h-[4.25rem] sm:min-w-0 sm:flex-col sm:items-start sm:py-3",
              category === "all"
                ? "border-accent bg-accent/15 ring-2 ring-accent/35"
                : "border-border bg-white"
            )}
          >
            <span className="text-xl sm:text-2xl" aria-hidden>
              📚
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">All lessons</span>
              <span className="mt-0.5 hidden text-[11px] leading-4 text-muted sm:block">
                Every pack for this country
              </span>
            </span>
          </button>
          {DISCOVER_CATEGORIES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={category === entry.id}
              data-testid={`discover-category-${entry.id}`}
              onClick={() => selectCategory(entry.id)}
              className={cn(
                "flex min-h-11 min-w-[8.5rem] shrink-0 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left sm:min-h-[4.25rem] sm:min-w-0 sm:flex-col sm:items-start sm:py-3",
                category === entry.id
                  ? "border-accent bg-accent/15 ring-2 ring-accent/35"
                  : "border-border bg-white"
              )}
            >
              <span className="text-xl sm:text-2xl" aria-hidden>
                {entry.emoji}
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{entry.label}</span>
                <span className="mt-0.5 hidden text-[11px] leading-4 text-muted sm:block">
                  {entry.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        ref={resultsRef}
        id="discover-results"
        tabIndex={-1}
        className="scroll-mt-24 space-y-3 rounded-2xl border border-border bg-violet-50/40 p-3 sm:p-4"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground" data-testid="discover-results-heading">
            {categoryLabel(category)}
            {!catalogLoading ? (
              <span className="ml-2 font-medium text-muted">
                ({list.length} {list.length === 1 ? "lesson" : "lessons"})
              </span>
            ) : null}
          </p>
          {category !== "all" ? (
            <button
              type="button"
              className="min-h-11 rounded-full border border-border bg-white px-3 text-xs font-medium text-muted"
              onClick={() => selectCategory("all")}
            >
              Clear category
            </button>
          ) : null}
        </div>

        <details className="rounded-xl border border-border bg-white px-3 py-2">
          <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            More filters (subject, topic, language)
          </summary>
          <div className="mt-2 flex flex-wrap gap-2 pb-1">
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
              {languageOptions.map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_LABELS[code]}
                </option>
              ))}
            </select>
          </div>
        </details>

        {catalogLoading ? (
          <div className="rounded-2xl border border-border bg-white px-4 py-8 text-center text-sm text-muted">
            Loading {countryProfile?.name ?? "country"} lessons…
          </div>
        ) : list.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed border-border bg-white px-4 py-8 text-center"
            data-testid="discover-empty-state"
          >
            <p className="text-sm font-medium text-foreground">
              {category === "offline"
                ? "No offline lessons saved yet"
                : `No ${categoryLabel(category)} lessons match these filters`}
            </p>
            <p className="mt-1 text-xs text-muted">
              {category === "offline"
                ? "Open any lesson and tap Save for offline. Saved packs appear here."
                : "Try All grades, clear filters, or pick another category. We only ship verified Ghana packs for now."}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {category !== "all" ? (
                <button
                  type="button"
                  className="min-h-11 rounded-full border border-border px-4 text-sm font-medium"
                  onClick={() => selectCategory("all")}
                >
                  Show all lessons
                </button>
              ) : null}
              <button
                type="button"
                className="min-h-11 rounded-full border border-border px-4 text-sm font-medium"
                onClick={() => {
                  setLevel("all");
                  setSubject("all");
                  setTopic("all");
                  setLanguage("all");
                }}
              >
                Reset filters
              </button>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" data-testid="discover-results-list">
            {list.map((item) => {
              const saved = offlinePacks.some(
                (pack) => pack.itemId === item.id && isOfflinePackComplete(pack)
              );
              const cat = categoryMeta(item.discoverCategory);
              const langs = item.languages
                .slice(0, 2)
                .map((code) => LANGUAGE_LABELS[code])
                .join(" · ");
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveItem(item)}
                    className="flex min-h-[5.75rem] w-full items-stretch gap-3 rounded-2xl border border-border bg-white p-3 text-left shadow-sm transition-colors active:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    data-testid={`discover-item-${item.id}`}
                  >
                    <span
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#1a233f] text-3xl"
                      aria-hidden
                    >
                      {item.illustration.emoji}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                      <span>
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {item.title}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 font-medium text-accent">
                            <span aria-hidden>{cat.emoji}</span> {cat.label}
                          </span>
                          {langs ? <span>{langs}</span> : null}
                          {saved ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                              Offline
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-muted">
                          {item.levels.join(" · ")}
                          {item.ageSuitability ? ` · ${item.ageSuitability.label}` : ""}
                        </span>
                        <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-white">
                          Open
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
