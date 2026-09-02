import { domainFromUrl } from "../liveWebSecurity";
import type { WebSearchProvider, WebSearchResult } from "../types";

export function createSerperSearchProvider(apiKey: string): WebSearchProvider {
  return {
    id: "serper",
    async search(query, options) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": apiKey,
          },
          body: JSON.stringify({
            q: query.slice(0, 500),
            num: options.maxResults,
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Serper HTTP ${res.status}: ${errText.slice(0, 200)}`);
        }
        const data = (await res.json()) as {
          organic?: Array<{ title?: string; link?: string; snippet?: string }>;
        };
        const results: WebSearchResult[] = [];
        for (const row of data.organic ?? []) {
          if (!row.link) continue;
          results.push({
            title: row.title?.trim() || row.link,
            uri: row.link,
            snippet: row.snippet?.trim(),
            domain: domainFromUrl(row.link),
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
