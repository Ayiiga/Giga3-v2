"use client";

import { GigaSocialProfileLink } from "@/components/gigasocial/GigaSocialProfileLink";
import {
  rememberSearch,
  readRecentSearches,
  TRENDING_SEARCHES,
} from "@/lib/gigasocial/searchStorage";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Search, X } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";

interface GigaSocialSearchBarProps {
  sessionToken?: string | null;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const GigaSocialSearchBar = memo(function GigaSocialSearchBar({
  value,
  onChange,
  className,
}: GigaSocialSearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const debounced = useDebouncedValue(value, 280);

  useEffect(() => {
    setRecent(readRecentSearches());
  }, []);

  const creators = useQuery(
    api.gigaSocial.searchProfiles,
    debounced.trim().length >= 2 ? { query: debounced.trim(), limit: 6 } : "skip"
  );

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return TRENDING_SEARCHES.filter((term) => term.includes(q) && term !== q).slice(0, 5);
  }, [value]);

  const showPanel =
    focused && (value.trim().length > 0 || recent.length > 0 || suggestions.length > 0);

  function applySearch(term: string) {
    onChange(term);
    rememberSearch(term);
    setRecent(readRecentSearches());
    setFocused(false);
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && value.trim()) {
            applySearch(value.trim());
          }
        }}
        placeholder="Search creators, hashtags, topics…"
        aria-label="Search GigaSocial"
        className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-10 text-sm"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-muted/10"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}

      {showPanel ? (
        <div
          className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
          onMouseDown={(event) => event.preventDefault()}
        >
          {creators?.profiles?.length ? (
            <div className="border-b border-border px-3 py-2">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Creators
              </p>
              <ul className="space-y-1">
                {creators.profiles.map((profile) => (
                  <li key={profile.userId}>
                    <GigaSocialProfileLink
                      handle={profile.handle}
                      displayName={profile.displayName}
                      avatarUrl={profile.avatarUrl}
                      avatarSize="sm"
                      className="w-full px-1 py-1"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {suggestions.length ? (
            <div className="border-b border-border px-3 py-2">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Suggestions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applySearch(term)}
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:border-accent/30 hover:text-foreground"
                  >
                    #{term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {recent.length ? (
            <div className="px-3 py-2">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Recent searches
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applySearch(term)}
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:border-accent/30 hover:text-foreground"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!creators?.profiles?.length && !recent.length && !suggestions.length ? (
            <p className="px-3 py-3 text-xs text-muted">Type to search creators and topics.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);
  return debounced;
}
