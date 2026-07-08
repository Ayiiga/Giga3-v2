"use client";

import { searchPlatform } from "@/lib/automation/search";
import { invalidateSearchCache } from "@/lib/automation/cache";
import type { PlatformSearchResult } from "@/lib/automation/types";
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
};

export function PlatformSearchPanel() {
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchPlatform(query);
  }, [query, revision]);

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
        Search saved prompts, workflows, GigaLearn artifacts, Creator outputs, and more.
      </p>
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
