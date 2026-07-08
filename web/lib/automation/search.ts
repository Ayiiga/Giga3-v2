import { listSavedPrompts } from "@/lib/chat/savedPrompts";
import { listCreations, listPromptHistory as listCreatorPrompts } from "@/lib/creator-studio/workspace";
import { listArtifacts, listPromptHistory as listLearnPrompts } from "@/lib/gigalearn/workspace";
import type { PlatformSearchResult } from "./types";
import { listWorkflows } from "./workflows";
import { getCachedSearch, setCachedSearch } from "./cache";

export type ConversationSearchItem = {
  id: string;
  title: string;
  mode: string;
};

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function scoreMatch(query: string, ...fields: string[]): number {
  const q = normalize(query);
  if (!q) return 0;
  let score = 0;
  for (const field of fields) {
    const f = normalize(field);
    if (!f) continue;
    if (f === q) score += 100;
    else if (f.startsWith(q)) score += 60;
    else if (f.includes(q)) score += 30;
  }
  return score;
}

export function searchPlatform(
  query: string,
  options?: {
    conversations?: ConversationSearchItem[];
    limit?: number;
  }
): PlatformSearchResult[] {
  const q = query.trim();
  const limit = options?.limit ?? 24;
  const cacheKey = `search:${q}:${options?.conversations?.length ?? 0}`;
  const cached = getCachedSearch<PlatformSearchResult[]>(cacheKey);
  if (cached) return cached.slice(0, limit);

  const results: PlatformSearchResult[] = [];

  for (const prompt of listSavedPrompts()) {
    const score = scoreMatch(q, prompt.title, prompt.body);
    if (score > 0) {
      results.push({
        id: `prompt:${prompt.id}`,
        kind: "chat_prompt",
        title: prompt.title,
        snippet: prompt.body.slice(0, 120),
        score,
        createdAt: prompt.createdAt,
      });
    }
  }

  for (const wf of listWorkflows()) {
    const score = scoreMatch(q, wf.title, wf.description);
    if (score > 0) {
      results.push({
        id: `workflow:${wf.id}`,
        kind: "workflow",
        title: wf.title,
        snippet: wf.description,
        href: `/automation?workflow=${wf.id}`,
        score,
      });
    }
  }

  for (const art of listArtifacts()) {
    const score = scoreMatch(q, art.title, art.prompt, art.content);
    if (score > 0) {
      results.push({
        id: `learn:${art.id}`,
        kind: "learning_artifact",
        title: art.title,
        snippet: art.content.slice(0, 120),
        href: "/gigalearn?tab=workspace",
        score,
        createdAt: art.createdAt,
      });
    }
  }

  for (const entry of listLearnPrompts()) {
    const score = scoreMatch(q, entry.prompt);
    if (score > 0) {
      results.push({
        id: `learn-prompt:${entry.id}`,
        kind: "learning_artifact",
        title: "GigaLearn prompt",
        snippet: entry.prompt.slice(0, 120),
        href: "/gigalearn",
        score,
        createdAt: entry.createdAt,
      });
    }
  }

  for (const creation of listCreations()) {
    const score = scoreMatch(q, creation.title, creation.prompt, creation.content);
    if (score > 0) {
      results.push({
        id: `creator:${creation.id}`,
        kind: "creator_artifact",
        title: creation.title,
        snippet: creation.content.slice(0, 120),
        href: "/creator-studio",
        score,
        createdAt: creation.createdAt,
      });
    }
  }

  for (const entry of listCreatorPrompts()) {
    const score = scoreMatch(q, entry.prompt);
    if (score > 0) {
      results.push({
        id: `creator-prompt:${entry.id}`,
        kind: "creator_artifact",
        title: "Creator prompt",
        snippet: entry.prompt.slice(0, 120),
        href: "/creator-studio",
        score,
        createdAt: entry.createdAt,
      });
    }
  }

  for (const conv of options?.conversations ?? []) {
    const score = scoreMatch(q, conv.title, conv.mode);
    if (score > 0) {
      results.push({
        id: `chat:${conv.id}`,
        kind: "conversation",
        title: conv.title,
        snippet: `Mode: ${conv.mode}`,
        href: `/chat?c=${conv.id}`,
        score,
      });
    }
  }

  results.sort((a, b) => b.score - a.score || (b.createdAt ?? 0) - (a.createdAt ?? 0));
  setCachedSearch(cacheKey, results);
  return results.slice(0, limit);
}
