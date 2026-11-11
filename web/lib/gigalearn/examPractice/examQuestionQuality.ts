import type { TechBankQuestion } from "../academy/techBanks/techBankTypes";

const generatedBeceLeadIn = /^(?:which statement best explains the concept in this question|choose the best answer about this topic|why is the following concept useful in everyday life or learning):\s*/i;
const generatedSocialStudiesLeadIn = /^(?:During a school project in [^.]+, learners investigate the situation\.\s*|A local radio discussion raises the concern that\s+)/i;
const generatedScienceId = "exam-bece-science-curriculum-v1-";

export function examQuestionKey(question: TechBankQuestion): string {
  let stem = question.questionText
    .replace(generatedSocialStudiesLeadIn, "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’]/g, "'");
  // Number swaps in the same WASSCE calculation template are not new skills.
  if (/^exam-wassce-(?:core-mathematics|integrated-science)$/.test(question.courseSlug)) {
    stem = stem.replace(/\d+(?:[.,]\d+)?/g, "#");
  }
  return `${question.topicId}:${stem.replace(/[^\p{L}\p{N}#]+/gu, " ").trim()}`;
}

export function selectQualityExamQuestions(rows: TechBankQuestion[]): TechBankQuestion[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (generatedBeceLeadIn.test(row.questionText)) return false;
    if (
      row.courseSlug === "exam-bece-prep" &&
      row.topicId === "integrated-science" &&
      (row.questionType ?? "mcq") === "mcq" &&
      !row.questionId.startsWith(generatedScienceId)
    ) return false;
    if ((row.questionType ?? "mcq") === "mcq") {
      const options = row.options.map((option) => option.trim().normalize("NFKC").toLowerCase());
      if (options.length !== 4 || options.some((option) => !option) || new Set(options).size !== 4) return false;
      if (!Number.isInteger(row.correctIndex) || row.correctIndex < 0 || row.correctIndex > 3) return false;
    }
    const key = examQuestionKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
