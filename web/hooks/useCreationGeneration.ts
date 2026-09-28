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
import { useCallback, useState } from "react";

/** Staged generation through the existing GigaLearn backend action (same credits and providers). */
export function useCreationGeneration() {
  const generateContent = useAction(api.gigalearnStudio.generateContent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        setError("Session expired. Please sign in again.");
        return null;
      }
      setLoading(true);
      setError(null);
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
        });
        const content = response.content?.trim();
        if (!content) throw new Error("Giga3 AI returned an empty response. Please try again.");
        recordLearningActivity({ toolId: args.template.backendToolId, subject, creditsUsed: 2 });
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
        setError(formatMediaError(e));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [generateContent]
  );

  return { generateStage, loading, error, clearError: () => setError(null) };
}
