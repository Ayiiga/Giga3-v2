/** Shared types for GigaLearn Technology Learning Hub question banks. */

export type TechReviewStatus =
  | "pending_review"
  | "approved"
  | "needs_correction"
  | "rejected";

export type TechDifficulty = "beginner" | "intermediate" | "advanced";

export type TechPracticeMode =
  | "learn"
  | "practice_test"
  | "timed"
  | "revision"
  | "topic"
  | "random"
  | "challenge";

export type TechBankQuestion = {
  questionId: string;
  courseSlug: string;
  topicId: string;
  topicLabel: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: TechDifficulty;
  questionType: "mcq";
  sourceDocument: string;
  sourceQuestionNumber: number;
  reviewStatus: TechReviewStatus;
  tags: string[];
};

export type TechBankFile = {
  bankId: string;
  courseSlug: string;
  title: string;
  sourceDocument: string;
  questions: TechBankQuestion[];
};

export type TechTopicMeta = {
  id: string;
  label: string;
  questionCount: number;
};

export type TechCourseMeta = {
  bankId: string;
  courseSlug: string;
  title: string;
  difficulty: TechDifficulty;
  awaitingMaterials: boolean;
  sourceDocument: string | null;
  extractedFromSource: number;
  approvedQuestionCount: number;
  topics: TechTopicMeta[];
};

/** Learner-facing question (no answer key). */
export type TechPublicQuestion = {
  questionId: string;
  topicId: string;
  topicLabel: string;
  questionText: string;
  options: string[];
  difficulty: TechDifficulty;
  sourceQuestionNumber: number;
  reviewStatus: TechReviewStatus;
};
