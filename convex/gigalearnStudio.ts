"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { AiModeId } from "./aiModes";
import { getSystemPrompt } from "./aiModes";
import {
  buildRoutingContextFromUser,
  completeChatWithFailover,
  trimChatMessages,
} from "./chatEngine";
import {
  prepareAnswerQualityContext,
  toRetrievalSystemMessage,
  validateAnswerQuality,
} from "./answerQuality";
import { requireSessionWithMonitoring } from "./auth";
import { CREDIT_COSTS } from "./creditsConfig";
import {
  personaSystemPromptAddon,
  resolvePersonaForGigaLearnTool,
} from "./gigaPersonas";

const TOOL_MODE_MAP: Record<string, AiModeId> = {
  "quiz-generator": "gigalearn",
  "assignment-generator": "gigalearn",
  "lesson-generator": "gigalearn",
  "lesson-notes": "gigalearn",
  "study-plan": "gigalearn",
  "practice-questions": "waec",
  "exam-prep": "waec",
  "bece-mock": "waec",
  "worksheet-generator": "gigalearn",
  "assessment-generator": "gigalearn",
  "presentation-generator": "gigalearn",
  "video-script-generator": "gigalearn",
  "flashcard-generator": "gigalearn",
  "teaching-aid-generator": "gigalearn",
  "practical-activity-generator": "gigalearn",
  "parent-summary": "gigalearn",
  "homework-explain": "homework",
  "topic-explainer": "gigalearn",
  "revision-guide": "waec",
  "class-activity": "gigalearn",
  "progress-report": "gigalearn",
  "learning-tips": "gigalearn",
};

/** Every AI-generated question set is labelled — never official WAEC/BECE. */
const AI_PRACTICE_LABEL_INSTRUCTION =
  'Label the question set with "AI-generated practice question" where appropriate. ' +
  "Never describe AI-generated questions as official WAEC/BECE questions unless they are actually sourced from an official source.";

const LESSON_GENERATOR_CONTRACT = `Generate a complete, professional lesson with exactly these sections, in order:
## Lesson Overview (Title, Subject, Grade, Duration, Topic, Learning objectives)
## Lesson Development (Previous knowledge, Introduction, Teaching/learning resources, Teacher activities, Learner activities, Explanation, Examples, Guided practice, Independent practice, Assessment, Conclusion, Homework)
## Teacher Support (Possible misconceptions, Differentiation ideas, Extension activities, Remedial activities, Teaching tips)
Adapt examples, language and pacing to the stated grade and curriculum.`;

const CAREER_TECH_PRACTICAL_CONTRACT = `For Career Technology practical content, always include: demonstration steps, a teacher demonstration script, learner activity, project assignment, assessment with marking guide, a materials checklist, and a safety checklist. For practical activities, clearly identify safety requirements and the need for appropriate teacher/supervisor oversight. Cover practical angles where relevant: tools, materials, safety, processes, design, construction, food-related activities, textiles, entrepreneurship, product development, occupational skills and projects.`;

function buildToolPrompt(
  toolId: string,
  prompt: string,
  curriculum?: string,
  subject?: string,
  level?: string,
  context?: string,
  extra?: {
    country?: string;
    grade?: string;
    strand?: string;
    subStrand?: string;
    topic?: string;
    learningObjective?: string;
    contentStandard?: string;
    indicator?: string;
  }
): string {
  const countryLine = extra?.country ? `Country: ${extra.country}.` : "";
  const curriculumLine = curriculum
    ? `Curriculum: ${curriculum}.`
    : "";
  const levelLine = level ? `Level: ${level}.` : "";
  const gradeLine = extra?.grade ? `Grade: ${extra.grade}.` : "";
  const subjectLine = subject ? `Subject: ${subject}.` : "";
  const strandLine = extra?.strand ? `Strand: ${extra.strand}.` : "";
  const subStrandLine = extra?.subStrand ? `Sub-strand: ${extra.subStrand}.` : "";
  const standardLine = extra?.contentStandard ? `Content Standard: ${extra.contentStandard}.` : "";
  const indicatorLine = extra?.indicator ? `Indicator: ${extra.indicator}.` : "";
  const topicLine = extra?.topic ? `Topic: ${extra.topic}.` : "";
  const objectiveLine = extra?.learningObjective
    ? `Learning objective: ${extra.learningObjective}.`
    : "";
  const contextLine = context?.trim()
    ? `Additional context:\n${context.trim()}`
    : "";

  const practiceJsonFooter = `
After the markdown content, append a fenced JSON block exactly like this (required for interactive practice):
\`\`\`json
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "stem": "Question text with African/Ghanaian context where appropriate",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "B",
      "explanation": "Age-appropriate explanation teaching the concept",
      "hint": "Optional hint",
      "difficulty": "medium",
      "learningObjective": "What the learner should understand",
      "points": 1,
      "visualCue": "Optional emoji for early learners e.g. 🍎 🍎 🍎"
    }
  ]
}
\`\`\`
Use types: mcq, true_false, fill_blank, short_answer, ordering, matching, poll. Every question must include explanation.`;

  const instructions: Record<string, string> = {
    "lesson-generator": LESSON_GENERATOR_CONTRACT,
    "quiz-generator":
      `Generate a curriculum-aware assessment with numbered questions across the requested types (Multiple choice, True/False, Short answer, Structured questions, Matching, Fill in the blank, Scenario-based questions, Practical questions). For every question provide marks, then an answer key with explanations and a marking guide. Use Ghanaian/African examples naturally. ${AI_PRACTICE_LABEL_INSTRUCTION}${practiceJsonFooter}`,
    "assignment-generator":
      "Create a clear assignment with instructions, questions, marks per question, Submission guidance, and a teacher marking guide.",
    "lesson-notes":
      "Write comprehensive lesson notes with learning objectives, key concepts, examples (use African context where helpful), and a short summary.",
    "study-plan":
      "Create a personalized study plan with daily/weekly goals, topics to cover, revision slots, and exam preparation tips.",
    "practice-questions":
      `Generate exam-style practice questions aligned to the stated curriculum. Include worked solutions step by step. Use BECE/JHS or WASSCE/SHS style as appropriate. ${AI_PRACTICE_LABEL_INSTRUCTION}${practiceJsonFooter}`,
    "exam-prep":
      `Provide focused exam preparation: likely topics, common question types, revision checklist, and timed practice questions with answers. ${AI_PRACTICE_LABEL_INSTRUCTION}${practiceJsonFooter}`,
    "bece-mock":
      `Generate a BECE-style mock test: topic revision summary, timed practice test with marks, full answer explanations, and revision recommendations for weak areas. ${AI_PRACTICE_LABEL_INSTRUCTION}${practiceJsonFooter}`,
    "assessment-generator":
      `Generate a formal assessment: instructions, questions with marks, answer key with explanations, and a marking scheme. ${AI_PRACTICE_LABEL_INSTRUCTION}${practiceJsonFooter}`,
    "presentation-generator":
      "Convert the lesson into presentation slides with exactly these slides in order: Title slide, Learning objectives, Main concepts, Examples, Activities, Questions, Summary, Assessment. Keep one clear idea per slide with speaker-note style explanations. Maintain the selected curriculum context throughout the presentation.",
    "video-script-generator":
      "Write an educational video script with exactly these sections in order: Title, Script, Scene breakdown, Narration, Captions, Visual suggestions. Keep narration conversational and matched to the stated grade. End with a one-paragraph short-form version.",
    "flashcard-generator":
      "Generate study flashcards as a numbered list. Each card has Front (question / term / concept) and Back (answer / explanation / example). Cover the topic progressively from recall to application.",
    "teaching-aid-generator":
      "Design low-cost teaching aids (charts, cards, classroom displays) with materials teachers can find locally, step-by-step construction, and how to use each aid in class.",
    "practical-activity-generator":
      `Design a hands-on practical activity: demonstration lesson, practical procedure, safety checklist, materials checklist, teacher demonstration script, learner activity, project assignment, assessment and marking guide. ${CAREER_TECH_PRACTICAL_CONTRACT}`,
    "worksheet-generator":
      "Create a printable worksheet for teachers with title, learning objective, instructions, activities, questions, space for student answers, and a teacher answer section.",
    "parent-summary":
      "Explain the topic in parent-friendly language: what the child is learning, how to support at home, and simple check questions.",
    "homework-explain":
      "Solve or explain the homework step by step. Show reasoning, formulas used, and the final answer. Encourage understanding.",
    "topic-explainer":
      "Explain the topic simply for the learner's stated grade with examples, analogies, and a quick recap. Adapt vocabulary and depth to the grade — simpler language and concrete examples for lower grades.",
    "revision-guide":
      `Create a revision guide with key facts, common mistakes, memory tips, and mini self-test questions. ${AI_PRACTICE_LABEL_INSTRUCTION}${practiceJsonFooter}`,
    "class-activity":
      "Design an engaging classroom activity with materials, steps, timing, and learning outcomes.",
    "progress-report":
      "Draft a constructive progress summary template a teacher or parent can adapt — strengths, areas to improve, next steps.",
    "learning-tips":
      "Give practical study tips tailored to the subject, level, and African school context (limited resources, exam focus).",
  };

  const instruction =
    instructions[toolId] ??
    "Generate helpful, structured educational content based on the user's request.";

  const subjectSpecificity =
    subject && /career[\s-]*technology/i.test(subject)
      ? CAREER_TECH_PRACTICAL_CONTRACT
      : "Treat the selected subject as exact context — never generic content. Every example, activity and assessment must fit the stated country, curriculum, level, grade, subject, strand and topic.";

  return [
    `GigaLearn task: ${toolId.replace(/-/g, " ")}.`,
    instruction,
    countryLine,
    curriculumLine,
    levelLine,
    gradeLine,
    subjectLine,
    strandLine,
    subStrandLine,
    standardLine,
    indicatorLine,
    topicLine,
    objectiveLine,
    subjectSpecificity,
    "Teacher request:",
    prompt.trim(),
    contextLine,
    "Use the curriculum selection above (country, curriculum, level, grade, subject, strand, sub-strand, content standard, indicator, topic, learning objective) to produce curriculum-aware lesson plans, lesson notes, class activities, class quizzes, assignments, worksheets, assessment items, revision materials and teaching resources. Align strands, examples and difficulty to the stated level. Never present invented strands or standards as official NaCCA content.",
    "Format the response in clear markdown. Use headings, lists, and worked examples. Be accurate and age-appropriate.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const generateContent = action({
  args: {
    sessionToken: v.string(),
    toolId: v.string(),
    prompt: v.string(),
    curriculum: v.optional(v.string()),
    subject: v.optional(v.string()),
    level: v.optional(v.string()),
    context: v.optional(v.string()),
    practiceScore: v.optional(v.number()),
    country: v.optional(v.string()),
    grade: v.optional(v.string()),
    strand: v.optional(v.string()),
    subStrand: v.optional(v.string()),
    topic: v.optional(v.string()),
    learningObjective: v.optional(v.string()),
    contentStandard: v.optional(v.string()),
    indicator: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const verifiedEmail = await requireSessionWithMonitoring(
      args.sessionToken,
      ctx
    );
    await ctx.runQuery(internal.entitlements.assertFeatureInternal, {
      userId: verifiedEmail,
      feature: "creator_studio",
    });
    const trimmed = args.prompt.trim();
    if (!trimmed) {
      throw new Error("Please describe what you want to learn or create.");
    }

    const usage = await ctx.runQuery(api.credits.getUsageSnapshot, {
      sessionToken: args.sessionToken,
    });
    if (!usage) throw new Error("User not found");
    if (usage.credits < CREDIT_COSTS.writing) {
      throw new Error(
        `Insufficient credits (${CREDIT_COSTS.writing} required, ${usage.credits} available).`
      );
    }

    const mode = TOOL_MODE_MAP[args.toolId] ?? "gigalearn";
    const personaId = resolvePersonaForGigaLearnTool({
      toolId: args.toolId,
      curriculum: args.curriculum,
    });
    const personaAddon = personaSystemPromptAddon(personaId);
    const userMessage = buildToolPrompt(
      args.toolId,
      trimmed,
      args.curriculum,
      args.subject,
      args.level,
      args.context,
      {
        country: args.country,
        grade: args.grade,
        strand: args.strand,
        subStrand: args.subStrand,
        topic: args.topic,
        learningObjective: args.learningObjective,
        contentStandard: args.contentStandard,
        indicator: args.indicator,
      }
    );

    const qualityContext = prepareAnswerQualityContext({
      mode,
      query: trimmed,
      history: [{ role: "user", content: userMessage }],
    });

    const hasPurchasedCredits = await ctx.runQuery(
      internal.credits.userHasPurchasedCreditsInternal,
      { userId: verifiedEmail }
    );

    const routing = buildRoutingContextFromUser({
      subscriptionPlan: usage.subscriptionPlan ?? "free",
      subscriptionExpiresAt: usage.subscriptionExpiresAt,
      hasPurchasedCredits: Boolean(hasPurchasedCredits),
      mode,
      query: trimmed,
    });

    const engineResult = await completeChatWithFailover(
      trimChatMessages(
        [
          {
            role: "system",
            content: `${getSystemPrompt(mode)}${personaAddon ? `\n\n${personaAddon}` : ""}\n\n${qualityContext.systemPromptAddon}`,
          },
          ...toRetrievalSystemMessage(qualityContext),
          { role: "user", content: userMessage },
        ],
        4
      ),
      routing
    );

    const validated = validateAnswerQuality({
      answer: engineResult.content,
      context: qualityContext,
    });

    if (engineResult.providerId !== "local_fallback") {
      await ctx.runMutation(api.credits.deductCredits, {
        sessionToken: args.sessionToken,
        action: "writing",
        reference: `gigalearn:${args.toolId}`,
        metadata: JSON.stringify({
          source: "gigalearn",
          toolId: args.toolId,
          curriculum: args.curriculum ?? null,
          subject: args.subject ?? null,
          level: args.level ?? null,
          country: args.country ?? null,
          grade: args.grade ?? null,
          strand: args.strand ?? null,
          subStrand: args.subStrand ?? null,
          topic: args.topic ?? null,
          contentStandard: args.contentStandard ?? null,
          indicator: args.indicator ?? null,
        }),
      });
    }

    await ctx.runMutation(internal.gigaLearnProgress.recordAssessmentInternal, {
      userId: verifiedEmail,
      toolId: args.toolId,
      subject: args.subject,
      curriculum: args.curriculum,
      score: args.practiceScore,
    });

    const updatedUsage = await ctx.runQuery(api.credits.getUsageSnapshot, {
      sessionToken: args.sessionToken,
    });

    return {
      content: validated.content,
      toolId: args.toolId,
      mode,
      personaId,
      credits: updatedUsage?.credits ?? usage.credits,
      usedFallback: engineResult.usedFallback,
      provider: engineResult.providerId,
    };
  },
});
