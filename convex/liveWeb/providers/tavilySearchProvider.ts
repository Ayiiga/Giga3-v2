import { domainFromUrl } from "../liveWebSecurity";
import type { WebSearchProvider, WebSearchResult } from "../types";

export function createTavilySearchProvider(apiKey: string): WebSearchProvider {
  return {
    id: "tavily",
    async search(query, options) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            query: query.slice(0, 500),
            search_depth: "basic",
            max_results: options.maxResults,
            include_answer: false,
            include_raw_content: false,
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Tavily HTTP ${res.status}: ${errText.slice(0, 200)}`);
        }
        const data = (await res.json()) as {
          results?: Array<{ title?: string; url?: string; content?: string }>;
        };
        const results: WebSearchResult[] = [];
        for (const row of data.results ?? []) {
          if (!row.url) continue;
          results.push({
            title: row.title?.trim() || row.url,
            uri: row.url,
            snippet: row.content?.trim(),
            domain: domainFromUrl(row.url),
          });
          if (results.length >= options.maxResults) break;
        }
        return results;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
