import { domainFromUrl } from "../liveWebSecurity";
import type { WebSearchProvider, WebSearchResult } from "../types";

export function createBraveSearchProvider(apiKey: string): WebSearchProvider {
  return {
    id: "brave",
    async search(query, options) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        const params = new URLSearchParams({
          q: query.slice(0, 500),
          count: String(options.maxResults),
        });
        const res = await fetch(
          `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
          {
            headers: {
              Accept: "application/json",
              "X-Subscription-Token": apiKey,
            },
            signal: controller.signal,
          }
        );
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Brave HTTP ${res.status}: ${errText.slice(0, 200)}`);
        }
        const data = (await res.json()) as {
          web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
        };
        const results: WebSearchResult[] = [];
        for (const row of data.web?.results ?? []) {
          if (!row.url) continue;
          results.push({
            title: row.title?.trim() || row.url,
            uri: row.url,
            snippet: row.description?.trim(),
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
