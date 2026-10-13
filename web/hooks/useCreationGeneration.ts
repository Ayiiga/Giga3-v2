"use client";

import { getSessionToken } from "@/lib/auth";
import { formatValue } from "@/lib/gigalearn/creation/intake";
import { buildStagePrompt, finalizeStageContent } from "@/lib/gigalearn/creation/prompts";
import type {
  CreationInputs,
  CreationStage,
  CreationTemplate,
  GeneratedSection,
  SourceReference,
} from "@/lib/gigalearn/creation/types";
import { canGenerateToday, recordLearningActivity } from "@/lib/gigalearn/workspace";
import { formatMediaError } from "@/lib/media/errors";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useRef, useState } from "react";

function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Staged generation through the existing GigaLearn backend action (same credits and providers). */
export function useCreationGeneration() {
  const generateContent = useAction(api.gigalearnStudio.generateContent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Stable idempotency keys per stage so ambiguous retries reuse the same reservation. */
  const requestIdsRef = useRef<Map<string, string>>(new Map());

  const generateStage = useCallback(
    async (args: {
      template: CreationTemplate;
      inputs: CreationInputs;
      stage: CreationStage;
      previousSections: GeneratedSection[];
      demonstrationData: boolean;
      sourceReferences: SourceReference[];
    }): Promise<GeneratedSection | null> => {
      if (!canGenerateToday()) {
        setError("Daily GigaLearn generation limit reached. Try again tomorrow.");
        return null;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setError("You're offline. Your details are kept — reconnect and tap Generate again.");
        return null;
      }
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        setError("Session expired. Please sign in again.");
        return null;
      }
      setLoading(true);
      setError(null);
      const stageKey = `${args.template.id}:${args.stage.id}`;
      let clientRequestId = requestIdsRef.current.get(stageKey);
      if (!clientRequestId) {
        clientRequestId = newClientRequestId();
        requestIdsRef.current.set(stageKey, clientRequestId);
      }
      try {
        const { prompt, context } = buildStagePrompt(args);
        const subject = formatValue(args.inputs.subject) || undefined;
        const level = formatValue(args.inputs.level) || undefined;
        const response = await generateContent({
          sessionToken,
          toolId: args.template.backendToolId,
          prompt,
          context,
          subject,
          level,
          clientRequestId,
        });
        const content = response.content?.trim();
        if (!content) throw new Error("Giga3 AI returned an empty response. Please try again.");
        recordLearningActivity({ toolId: args.template.backendToolId, subject, creditsUsed: 2 });
        // Success — next regenerate of this stage gets a fresh reservation id.
        requestIdsRef.current.delete(stageKey);
        return {
          stageId: args.stage.id,
          label: args.stage.label,
          content: finalizeStageContent(content, {
            stage: args.stage,
            demonstrationData: args.demonstrationData,
          }),
          generatedAt: Date.now(),
          demonstrationData: Boolean(
            args.demonstrationData && (args.stage.userDataStage || args.stage.dependsOnFindings)
          ),
          provider: response.provider,
        };
      } catch (e) {
        const message = formatMediaError(e);
        // Force a new id when the prior hold is terminal or expired.
        if (
          /already completed|hold expired|refunded|finalize the credit charge|settle credits/i.test(
            message
          )
        ) {
          requestIdsRef.current.delete(stageKey);
        }
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [generateContent]
  );

  return { generateStage, loading, error, clearError: () => setError(null) };
}
