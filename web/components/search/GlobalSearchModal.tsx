"use client";

import { searchPlatform } from "@/lib/automation/search";
import type { PlatformSearchResult } from "@/lib/automation/types";
import {
  addRecentSearch,
  clearRecentSearches,
  getPopularSearches,
  getRecentSearches,
  getSearchSuggestions,
  searchStaticRoutes,
  SEARCH_CATEGORY_FILTERS,
  type SearchCategoryFilter,
} from "@/lib/platform/globalSearch";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const KIND_LABELS: Record<string, string> = {
  chat_prompt: "Prompt",
  workflow: "Workflow",
  learning_artifact: "Learning",
  creator_artifact: "Creator",
  conversation: "Chat",
  community: "Community",
  ai_tool: "AI tool",
  settings: "Page",
  wallet: "Wallet",
  marketplace: "Marketplace",
};

type GlobalSearchModalProps = {
  open: boolean;
  onClose: () => void;
  conversations?: { id: string; title: string; mode: string }[];
};

export function GlobalSearchModal({ open, onClose, conversations }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [category, setCategory] = useState<SearchCategoryFilter>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setRecent(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setCategory("all");
    }
  }, [open]);

  const suggestions = useMemo(() => getSearchSuggestions(query), [query]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const platform = searchPlatform(query, {
      conversations: conversations?.map((c) => ({
        id: c.id,
        title: c.title,
        mode: c.mode,
      })),
    });
    const routes = searchStaticRoutes(query, category);
    const merged = new Map<string, PlatformSearchResult>();
    for (const r of [...platform, ...routes]) {
      if (category === "prompts" && r.kind !== "chat_prompt") continue;
      if (category === "tools" && !["ai_tool", "workflow", "conversation", "creator_artifact"].includes(r.kind)) continue;
      if (category === "learning" && r.kind !== "learning_artifact") continue;
      if (category === "community" && r.kind !== "community") continue;
      if (category === "pages" && !["settings", "wallet", "marketplace"].includes(r.kind) && !r.id.startsWith("route:")) continue;
      const existing = merged.get(r.id);
      if (!existing || r.score > existing.score) merged.set(r.id, r);
    }
    return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 20);
  }, [query, conversations, category]);

  const handleSelect = useCallback(
    (q: string) => {
      if (q.trim()) addRecentSearch(q);
      onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const popular = getPopularSearches();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      onClick={onClose}
    >
      <div
        className="saas-card w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats, prompts, tools, trending topics…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            aria-label="Search query"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-muted/50"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {SEARCH_CATEGORY_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setCategory(filter.id)}
                className={
                  category === filter.id
                    ? "rounded-full border border-accent bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent"
                    : "rounded-full border border-border px-2.5 py-1 text-[11px] text-muted hover:border-accent/30"
                }
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() && recent.length > 0 && (
            <div className="mb-3 px-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted">Recent searches</p>
                <button
                  type="button"
                  className="text-xs text-accent hover:underline"
                  onClick={() => {
                    clearRecentSearches();
                    setRecent([]);
                  }}
                >
                  Clear
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent/30"
                    onClick={() => setQuery(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!query.trim() && (
            <div className="mb-3 px-2">
              <p className="text-xs font-medium text-muted">Popular searches</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {popular.slice(0, 8).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent/30"
                    onClick={() => setQuery(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim() && suggestions.length > 0 && (
            <div className="mb-2 px-2">
              <p className="text-xs font-medium text-muted">Suggestions</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs text-accent"
                    onClick={() => setQuery(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!query.trim() && (
            <p className="px-3 py-2 text-center text-xs text-muted">
              Press <kbd className="rounded border px-1">Ctrl</kbd>+<kbd className="rounded border px-1">K</kbd> anywhere to search
            </p>
          )}

          {query.trim() && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted">No results for &ldquo;{query}&rdquo;</p>
          )}

          <ul className="space-y-1">
            {results.map((r) => (
              <li key={r.id}>
                {r.href ? (
                  <Link
                    href={r.href}
                    className="block rounded-lg px-3 py-2 hover:bg-accent/5"
                    onClick={() => handleSelect(query)}
                  >
                    <ResultRow result={r} />
                  </Link>
                ) : (
                  <div className="rounded-lg px-3 py-2">
                    <ResultRow result={r} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: PlatformSearchResult }) {
  return (
    <>
      <span className="text-xs text-muted">{KIND_LABELS[result.kind] ?? result.kind}</span>
      <p className="text-sm font-medium">{result.title}</p>
      <p className="line-clamp-1 text-xs text-muted">{result.snippet}</p>
    </>
  );
}
