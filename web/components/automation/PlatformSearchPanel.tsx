"use client";

import { searchPlatform } from "@/lib/automation/search";
import { invalidateSearchCache } from "@/lib/automation/cache";
import type { PlatformSearchResult } from "@/lib/automation/types";
import {
  getPopularSearches,
  getRecentSearches,
  searchStaticRoutes,
  SEARCH_CATEGORY_FILTERS,
  type SearchCategoryFilter,
} from "@/lib/platform/globalSearch";
import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const KIND_LABELS: Record<PlatformSearchResult["kind"], string> = {
  chat_prompt: "Saved prompt",
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

function matchesSearchCategory(result: PlatformSearchResult, category: SearchCategoryFilter): boolean {
  if (category === "all") return true;
  if (category === "prompts") return result.kind === "chat_prompt";
  if (category === "tools") {
    return ["ai_tool", "workflow", "conversation", "creator_artifact"].includes(result.kind);
  }
  if (category === "learning") return result.kind === "learning_artifact";
  if (category === "community") return result.kind === "community";
  if (category === "pages") {
    return (
      ["settings", "wallet", "marketplace", "ai_tool"].includes(result.kind) &&
      Boolean(result.href) &&
      !result.href?.startsWith("/chat")
    );
  }
  return true;
}

export function PlatformSearchPanel() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategoryFilter>("all");
  const [revision, setRevision] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const platform = searchPlatform(query).filter((r) => matchesSearchCategory(r, category));
    const routes = searchStaticRoutes(query, category);
    const merged = new Map<string, PlatformSearchResult>();
    for (const r of [...platform, ...routes]) {
      const existing = merged.get(r.id);
      if (!existing || r.score > existing.score) merged.set(r.id, r);
    }
    return [...merged.values()].sort((a, b) => b.score - a.score);
  }, [query, revision, category]);

  function handleRefresh() {
    invalidateSearchCache();
    setRevision((r) => r + 1);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Search className="h-4 w-4" aria-hidden />
        Platform search
      </h2>
      <p className="text-sm text-muted">
        Search saved prompts, curated library, workflows, GigaLearn artifacts, Creator outputs, and platform pages.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SEARCH_CATEGORY_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setCategory(filter.id)}
            className={
              category === filter.id
                ? "rounded-full border border-accent bg-accent/10 px-2.5 py-1 text-[11px] text-accent"
                : "rounded-full border border-border px-2.5 py-1 text-[11px] text-muted"
            }
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats, resources, workflows…"
          className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-lg border border-border px-3 text-xs text-muted hover:text-foreground"
        >
          Refresh
        </button>
      </div>

      {!query.trim() && (
        <div className="space-y-3 text-sm">
          {getRecentSearches().length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted">Recent searches</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {getRecentSearches().slice(0, 6).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuery(item)}
                    className="rounded-full border border-border px-3 py-1 text-xs"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted">Popular searches</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {getPopularSearches().slice(0, 6).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuery(item)}
                  className="rounded-full border border-border px-3 py-1 text-xs"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {query.trim() && results.length === 0 && (
        <p className="text-sm text-muted">No results for &ldquo;{query}&rdquo;</p>
      )}

      <ul className="space-y-2">
        {results.map((r) => (
          <li key={r.id}>
            {r.href ? (
              <Link
                href={r.href}
                className="block rounded-lg border border-border px-3 py-2 text-sm hover:border-accent/30"
              >
                <span className="text-xs text-muted">{KIND_LABELS[r.kind]}</span>
                <p className="font-medium">{r.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{r.snippet}</p>
              </Link>
            ) : (
              <div className="rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-xs text-muted">{KIND_LABELS[r.kind]}</span>
                <p className="font-medium">{r.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{r.snippet}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
