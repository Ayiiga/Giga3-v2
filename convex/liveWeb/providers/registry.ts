import { serperApiKey, braveSearchApiKey } from "../liveWebConfig";
import type { WebSearchProvider } from "../types";
import { createBraveSearchProvider } from "./braveSearchProvider";
import { createSerperSearchProvider } from "./serperSearchProvider";

export function resolveWebSearchProvider(): WebSearchProvider | null {
  const serperKey = serperApiKey();
  if (serperKey) return createSerperSearchProvider(serperKey);

  const braveKey = braveSearchApiKey();
  if (braveKey) return createBraveSearchProvider(braveKey);

  return null;
}

export function listConfiguredSearchProviders(): string[] {
  const ids: string[] = [];
  if (serperApiKey()) ids.push("serper");
  if (braveSearchApiKey()) ids.push("brave");
  return ids;
}
