import {
  braveSearchApiKey,
  serperApiKey,
  tavilyApiKey,
} from "../liveWebConfig";
import type { WebSearchProvider } from "../types";
import { createBraveSearchProvider } from "./braveSearchProvider";
import { createSerperSearchProvider } from "./serperSearchProvider";
import { createTavilySearchProvider } from "./tavilySearchProvider";

export function resolveWebSearchProviders(): WebSearchProvider[] {
  const providers: WebSearchProvider[] = [];

  const tavilyKey = tavilyApiKey();
  if (tavilyKey) providers.push(createTavilySearchProvider(tavilyKey));

  const serperKey = serperApiKey();
  if (serperKey) providers.push(createSerperSearchProvider(serperKey));

  const braveKey = braveSearchApiKey();
  if (braveKey) providers.push(createBraveSearchProvider(braveKey));

  return providers;
}

export function resolveWebSearchProvider(): WebSearchProvider | null {
  return resolveWebSearchProviders()[0] ?? null;
}

export function listConfiguredSearchProviders(): string[] {
  const ids: string[] = [];
  if (tavilyApiKey()) ids.push("tavily");
  if (serperApiKey()) ids.push("serper");
  if (braveSearchApiKey()) ids.push("brave");
  return ids;
}
