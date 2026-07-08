"use client";

import { formatMediaError } from "@/lib/media/errors";
import { getGigaLearnTool } from "@/lib/gigalearn/tools";
import {
  canGenerateToday,
  recordLearningActivity,
  recordPromptHistory,
  saveArtifact,
} from "@/lib/gigalearn/workspace";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useState } from "react";

export type GigaLearnGenerationPhase = "idle" | "generating" | "success" | "error";

export function useGigaLearnGeneration() {
  const generateContent = useAction(api.gigalearnStudio.generateContent);
  const [phase, setPhase] = useState<GigaLearnGenerationPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [lastToolId, setLastToolId] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [lastCurriculum, setLastCurriculum] = useState<string | undefined>();
  const [lastSubject, setLastSubject] = useState<string | undefined>();
  const [lastLevel, setLastLevel] = useState<string | undefined>();
  const [lastContext, setLastContext] = useState<string | undefined>();

  const clear = useCallback(() => {
    setError(null);
    setResult(null);
    setPhase("idle");
  }, []);

  const run = useCallback(
    async (args: {
      toolId: string;
      prompt: string;
      curriculum?: string;
      subject?: string;
      level?: string;
      context?: string;
    }) => {
      const tool = getGigaLearnTool(args.toolId);
      if (!tool) {
        setError("Unknown GigaLearn tool.");
        setPhase("error");
        return null;
      }
      if (!args.prompt.trim()) {
        setError("Please describe what you want to learn or create.");
        setPhase("error");
        return null;
      }
      if (!canGenerateToday()) {
        setError("Daily GigaLearn generation limit reached. Try again tomorrow.");
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
      setLastCurriculum(args.curriculum);
      setLastSubject(args.subject);
      setLastLevel(args.level);
      setLastContext(args.context);

      try {
        const response = await generateContent({
          sessionToken,
          toolId: args.toolId,
          prompt: args.prompt,
          curriculum: args.curriculum,
          subject: args.subject,
          level: args.level,
          context: args.context,
        });

        const content = response.content?.trim();
        if (!content) {
          throw new Error("Giga3 AI returned an empty response. Please try again.");
        }

        recordPromptHistory({
          toolId: args.toolId,
          prompt: args.prompt,
          curriculum: args.curriculum,
          subject: args.subject,
        });
        recordLearningActivity({
          toolId: args.toolId,
          subject: args.subject,
          creditsUsed: tool.creditCost,
        });
        saveArtifact({
          toolId: args.toolId,
          title: tool.label,
          prompt: args.prompt,
          content,
          curriculum: args.curriculum,
          subject: args.subject,
          level: args.level,
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
      curriculum: lastCurriculum,
      subject: lastSubject,
      level: lastLevel,
      context: lastContext,
    });
  }, [
    lastToolId,
    lastPrompt,
    lastCurriculum,
    lastSubject,
    lastLevel,
    lastContext,
    run,
  ]);

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
  };
}
