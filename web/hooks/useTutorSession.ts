"use client";

import { formatMediaError } from "@/lib/media/errors";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useState } from "react";

export type TutorChatMode =
  | "explain"
  | "simplify"
  | "example"
  | "hint"
  | "check"
  | "practice"
  | "correct"
  | "challenge"
  | "socratic"
  | "ask";

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
  mode?: string;
}

interface TutorContext {
  country?: string;
  curriculum?: string;
  level?: string;
  grade?: string;
  subject?: string;
  strand?: string;
  subStrand?: string;
  contentStandard?: string;
  indicator?: string;
  topic?: string;
  learningObjective?: string;
  countryId?: string;
  curriculumId?: string;
  levelId?: string;
  subjectId?: string;
}

/** Conversational adaptive tutor turns (1 credit each, same auth/credits). */
export function useTutorSession(args: {
  sessionToken: string | null;
  context: TutorContext;
  getPerformanceSummary?: () => string;
}) {
  const tutorTurn = useAction(api.adaptiveLearning.tutorTurn);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const send = useCallback(
    async (mode: TutorChatMode, studentInput: string) => {
      if (!args.sessionToken) {
        setError("Session expired. Please sign in again.");
        return null;
      }
      const trimmed = studentInput.trim();
      if (!trimmed) return null;
      setLoading(true);
      setError(null);
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev, { role: "user", content: trimmed, mode }]);
      try {
        const response = await tutorTurn({
          sessionToken: args.sessionToken,
          mode,
          context: args.context,
          studentInput: trimmed,
          history,
          performanceSummary: args.getPerformanceSummary?.() || undefined,
        });
        const reply = response.reply?.trim();
        if (!reply) throw new Error("The tutor returned an empty response. Please try again.");
        setMessages((prev) => [...prev, { role: "assistant", content: reply, mode }]);
        return reply;
      } catch (e) {
        setError(formatMediaError(e));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [args.sessionToken, args.context, args.getPerformanceSummary, messages, tutorTurn]
  );

  return { messages, loading, error, send, reset };
}
