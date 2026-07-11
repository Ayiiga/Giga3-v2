"use client";

import { Button } from "@/components/ui/Button";
import {
  CURATED_PROMPTS,
  PROMPT_CATEGORIES,
  type PromptCategoryId,
  type CuratedPrompt,
} from "@/lib/prompts/catalog";
import { isPromptFavorite, togglePromptFavorite } from "@/lib/prompts/favorites";
import { savePrompt } from "@/lib/chat/savedPrompts";
import { storePromptChatHandoff } from "@/lib/chat/promptHandoff";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Copy, Heart, MessageSquare, Share2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

export function PromptLibraryClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initialCategory = (params.get("category") as PromptCategoryId | null) ?? "all";
  const [category, setCategory] = useState<PromptCategoryId | "all">(
    PROMPT_CATEGORIES.some((c) => c.id === initialCategory) ? initialCategory : "all"
  );
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteRevision, setFavoriteRevision] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const prompts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CURATED_PROMPTS.filter((prompt) => {
      if (category !== "all" && prompt.category !== category) return false;
      if (favoritesOnly && !isPromptFavorite(prompt.id)) return false;
      if (!q) return true;
      return (
        prompt.title.toLowerCase().includes(q) ||
        prompt.description.toLowerCase().includes(q) ||
        prompt.tags.some((tag) => tag.includes(q))
      );
    });
  }, [category, favoritesOnly, query, favoriteRevision]);

  const copyPrompt = useCallback(async (prompt: CuratedPrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.body);
      setCopiedId(prompt.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  const openInChat = useCallback(
    (prompt: CuratedPrompt) => {
      storePromptChatHandoff({ prompt: prompt.body, title: prompt.title, sourceId: prompt.id });
      router.push("/chat");
    },
    [router]
  );

  const saveToLibrary = useCallback((prompt: CuratedPrompt) => {
    savePrompt(prompt.title, prompt.body);
  }, []);

  const sharePrompt = useCallback(async (prompt: CuratedPrompt) => {
    const url = `${siteConfig.url}/prompts?category=${prompt.category}#${prompt.id}`;
    const text = `${prompt.title}\n\n${prompt.body}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: prompt.title, text, url });
        return;
      } catch {
        /* fall through */
      }
    }
    await copyPrompt(prompt);
  }, [copyPrompt]);

  const toggleFavorite = useCallback((id: string) => {
    togglePromptFavorite(id);
    setFavoriteRevision((r) => r + 1);
  }, []);

  return (
    <div className="space-y-8">
      <header className="mx-auto max-w-3xl text-center">
        <p className="section-heading">Prompt library</p>
        <h1 className="page-title mt-3">Curated AI prompts</h1>
        <p className="section-lead mx-auto mt-4">
          Copy, save, favorite, or open prompts in chat — organized for education, business,
          coding, marketing, and more.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search prompts…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          aria-label="Search prompts"
        />
        <label className="inline-flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(e) => setFavoritesOnly(e.target.checked)}
            className="rounded border-border"
          />
          Favorites only
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm",
            category === "all"
              ? "border-accent bg-accent/10 text-accent"
              : "border-border text-muted hover:border-accent/30"
          )}
        >
          All
        </button>
        {PROMPT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm",
              category === cat.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-accent/30"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {prompts.length === 0 ? (
        <p className="text-center text-sm text-muted">No prompts match your filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {prompts.map((prompt) => (
            <article
              key={prompt.id}
              id={prompt.id}
              className="saas-card scroll-mt-28 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">
                    {PROMPT_CATEGORIES.find((c) => c.id === prompt.category)?.label}
                  </p>
                  <h2 className="mt-1 font-semibold text-foreground">{prompt.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFavorite(prompt.id)}
                  className="rounded-lg p-2 text-muted hover:bg-accent/10"
                  aria-label={isPromptFavorite(prompt.id) ? "Remove favorite" : "Add favorite"}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isPromptFavorite(prompt.id) && "fill-accent text-accent"
                    )}
                    aria-hidden
                  />
                </button>
              </div>
              <p className="mt-2 text-sm text-muted">{prompt.description}</p>
              <pre className="mt-3 max-h-32 overflow-auto rounded-xl border border-border bg-zinc-50 p-3 text-xs leading-relaxed text-foreground dark:bg-zinc-900/40">
                {prompt.body}
              </pre>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => openInChat(prompt)}>
                  <MessageSquare className="h-4 w-4" aria-hidden />
                  Use in chat
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void copyPrompt(prompt)}>
                  <Copy className="h-4 w-4" aria-hidden />
                  {copiedId === prompt.id ? "Copied" : "Copy"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => saveToLibrary(prompt)}>
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void sharePrompt(prompt)}>
                  <Share2 className="h-4 w-4" aria-hidden />
                  Share
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
