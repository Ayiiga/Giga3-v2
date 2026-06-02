import type { AiProvider, CompletionRequest, CompletionResult } from "../types";
import { getOpenAIClient, getOpenAIModel } from "../../openai";

export const openaiProvider: AiProvider = {
  id: "openai",

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const client = getOpenAIClient();
    const model = request.model ?? getOpenAIModel();

    const response = await client.chat.completions.create({
      model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
    });

    const content =
      response.choices[0]?.message?.content?.trim() ||
      "I could not generate a response.";

    return { content, provider: "openai", model };
  },
};
