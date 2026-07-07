"use client";

import { getSessionToken } from "@/lib/auth";
import { formatMediaError } from "@/lib/media/errors";
import {
  canGenerateToday,
  recordCreatorUsage,
  recordPromptHistory,
  saveCreation,
} from "@/lib/creator-studio/workspace";
import { getCreatorTool } from "@/lib/creator-studio/tools";
import type { SocialPlatformId } from "@/lib/creator-studio/tools";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useState } from "react";

export type CreatorGenerationPhase = "idle" | "generating" | "success" | "error";

export function useCreatorGeneration() {
  const generateContent = useAction(api.creatorStudio.generateContent);
  const [phase, setPhase] = useState<CreatorGenerationPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [lastToolId, setLastToolId] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [lastPlatform, setLastPlatform] = useState<SocialPlatformId | undefined>();

  const clear = useCallback(() => {
    setError(null);
    setResult(null);
    setPhase("idle");
  }, []);

  const run = useCallback(
    async (args: {
      toolId: string;
      prompt: string;
      platform?: SocialPlatformId;
      context?: string;
      kind?: "writing" | "social";
    }) => {
      const tool = getCreatorTool(args.toolId);
      if (!tool) {
        setError("Unknown creator tool.");
        setPhase("error");
        return null;
      }
      if (!args.prompt.trim()) {
        setError("Please describe what you want to create.");
        setPhase("error");
        return null;
      }
      if (!canGenerateToday()) {
        setError("Daily creator generation limit reached. Try again tomorrow.");
        setPhase("error");
        return null;
      }

      const sessionToken = getSessionToken();
      if (!sessionToken) {
        setError("Session expired. Please sign in again.");
        setPhase("error");
        return null;
      }

      setPhase("generating");
      setError(null);
      setResult(null);
      setLastToolId(args.toolId);
      setLastPrompt(args.prompt);
      setLastPlatform(args.platform);

      try {
        const response = await generateContent({
          sessionToken,
          toolId: args.toolId,
          prompt: args.prompt,
          platform: args.platform,
          context: args.context,
        });

        const content = response.content?.trim();
        if (!content) {
          throw new Error("Giga3 AI returned an empty response. Please try again.");
        }

        const kind = args.kind ?? tool.section;
        recordPromptHistory({
          toolId: args.toolId,
          prompt: args.prompt,
          platform: args.platform,
        });
        recordCreatorUsage(kind, tool.creditCost);
        saveCreation({
          kind,
          toolId: args.toolId,
          title: tool.label,
          prompt: args.prompt,
          content,
          platform: args.platform,
        });

        setResult(content);
        setPhase("success");
        return content;
      } catch (e) {
        const msg = formatMediaError(e);
        setError(msg);
        setPhase("error");
        return null;
      }
    },
    [generateContent]
  );

  const regenerate = useCallback(async () => {
    if (!lastToolId || !lastPrompt) return null;
    return run({
      toolId: lastToolId,
      prompt: lastPrompt,
      platform: lastPlatform,
    });
  }, [lastToolId, lastPrompt, lastPlatform, run]);

  return {
    phase,
    loading: phase === "generating",
    error,
    result,
    clear,
    run,
    regenerate,
    lastToolId,
    lastPrompt,
    lastPlatform,
  };
}
