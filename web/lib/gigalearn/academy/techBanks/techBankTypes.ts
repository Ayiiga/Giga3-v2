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

/** Supported interactive formats in Exam Practice / Tech Hub banks. */
export type TechQuestionType = "mcq" | "true_false";

export type TechBankQuestion = {
  questionId: string;
  courseSlug: string;
  topicId: string;
  topicLabel: string;
  questionText: string;
  options: string[];
  /**
   * Stable option identities (parallel to `options`). Runtime shuffle remaps
   * display order; grading uses correctIndex / correctOptionId + permutations.
   * True/False uses fixed ["True","False"] — never shuffled.
   */
  optionIds?: string[];
  correctIndex: number;
  correctOptionId?: string;
  explanation: string;
  /**
   * Parallel to `options` — concise why-correct / why-incorrect notes shown
   * after submission (learn mode) or in end-of-session review. Never shown
   * before the learner submits when exam rules withhold feedback.
   */
  optionExplanations?: string[];
  difficulty: TechDifficulty;
  questionType: TechQuestionType;
  sourceDocument: string;
  sourceQuestionNumber: number;
  reviewStatus: TechReviewStatus;
  tags: string[];
  sourceType?: "original_practice" | "adapted" | "verified_historical" | "awaiting_verification";
  verificationStatus?: "awaiting_verification" | "human_verified" | "rejected";
  /** Public-source notes — never implies official GES exam approval. */
  verificationNotes?: string;
  publicationStatus?: "published_practice" | "draft" | "retired";
  accessTier?: Array<"free" | "premium">;
  promotionRank?: string;
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
  /** Presentation format — True/False must not render as four-option MCQ. */
  questionType: TechQuestionType;
};
