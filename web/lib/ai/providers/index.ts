import type { AiProvider } from "../types";
import { openaiProvider } from "./openai";

const providers: Record<string, AiProvider> = {
  openai: openaiProvider,
};

export function getAiProvider(id: string = process.env.AI_PROVIDER ?? "openai"): AiProvider {
  const provider = providers[id];
  if (!provider) {
    throw new Error(`Unknown AI provider: ${id}`);
  }
  return provider;
}

export function listProviders(): string[] {
  return Object.keys(providers);
}
