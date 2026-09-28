"use client";

import { formatMediaError } from "@/lib/media/errors";
import {
  getPracticeFallbackQuestions,
  isInteractivePracticeTool,
  parseQuestionsFromContent,
  type GigaLearnQuestion,
} from "@/lib/gigalearn/questions";
import { getGigaLearnTool, type GigaLearnToolSection } from "@/lib/gigalearn/tools";
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
  const [questions, setQuestions] = useState<GigaLearnQuestion[]>([]);
  const [lastToolId, setLastToolId] = useState<string | null>(null);
  const [lastSection, setLastSection] = useState<GigaLearnToolSection | undefined>();
  const [lastPrompt, setLastPrompt] = useState("");
  const [lastCurriculum, setLastCurriculum] = useState<string | undefined>();
  const [lastSubject, setLastSubject] = useState<string | undefined>();
  const [lastLevel, setLastLevel] = useState<string | undefined>();
  const [lastContext, setLastContext] = useState<string | undefined>();
  const [lastCountry, setLastCountry] = useState<string | undefined>();
  const [lastGrade, setLastGrade] = useState<string | undefined>();
  const [lastStrand, setLastStrand] = useState<string | undefined>();
  const [lastSubStrand, setLastSubStrand] = useState<string | undefined>();
  const [lastTopic, setLastTopic] = useState<string | undefined>();
  const [lastLearningObjective, setLastLearningObjective] = useState<string | undefined>();

  const clear = useCallback(() => {
    setError(null);
    setResult(null);
    setQuestions([]);
    setPhase("idle");
  }, []);

  const run = useCallback(
    async (args: {
      toolId: string;
      section?: GigaLearnToolSection;
      prompt: string;
      curriculum?: string;
      subject?: string;
      level?: string;
      context?: string;
      country?: string;
      grade?: string;
      strand?: string;
      subStrand?: string;
      topic?: string;
      learningObjective?: string;
    }) => {
      const tool = getGigaLearnTool(args.toolId, args.section);
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
      setQuestions([]);
      setLastToolId(args.toolId);
      setLastSection(args.section);
      setLastPrompt(args.prompt);
      setLastCurriculum(args.curriculum);
      setLastSubject(args.subject);
      setLastLevel(args.level);
      setLastContext(args.context);
      setLastCountry(args.country);
      setLastGrade(args.grade);
      setLastStrand(args.strand);
      setLastSubStrand(args.subStrand);
      setLastTopic(args.topic);
      setLastLearningObjective(args.learningObjective);

      try {
        const response = await generateContent({
          sessionToken,
          toolId: args.toolId,
          prompt: args.prompt,
          curriculum: args.curriculum,
          subject: args.subject,
          level: args.level,
          context: args.context,
          country: args.country,
          grade: args.grade,
          strand: args.strand,
          subStrand: args.subStrand,
          topic: args.topic,
          learningObjective: args.learningObjective,
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

        if (isInteractivePracticeTool(args.toolId)) {
          const parsed = parseQuestionsFromContent(content);
          setQuestions(
            parsed.length
              ? parsed
              : getPracticeFallbackQuestions(args.level ?? "jhs-2", args.subject ?? "mathematics")
          );
        } else {
          setQuestions([]);
        }

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
      section: lastSection,
      prompt: lastPrompt,
      curriculum: lastCurriculum,
      subject: lastSubject,
      level: lastLevel,
      context: lastContext,
      country: lastCountry,
      grade: lastGrade,
      strand: lastStrand,
      subStrand: lastSubStrand,
      topic: lastTopic,
      learningObjective: lastLearningObjective,
    });
  }, [
    lastToolId,
    lastSection,
    lastPrompt,
    lastCurriculum,
    lastSubject,
    lastLevel,
    lastContext,
    lastCountry,
    lastGrade,
    lastStrand,
    lastSubStrand,
    lastTopic,
    lastLearningObjective,
    run,
  ]);

  return {
    phase,
    loading: phase === "generating",
    error,
    result,
    questions,
    clear,
    run,
    regenerate,
    lastToolId,
    lastPrompt,
  };
}
