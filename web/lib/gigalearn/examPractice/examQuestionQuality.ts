import type { TechBankQuestion } from "../academy/techBanks/techBankTypes";

const generatedBeceLeadIn = /^(?:which statement best explains the concept in this question|choose the best answer about this topic|why is the following concept useful in everyday life or learning):\s*/i;
const generatedSocialStudiesLeadIn = /^(?:During a school project in [^.]+, learners investigate the situation\.\s*|A local radio discussion raises the concern that\s+)/i;
const sciencePracticeId = /^exam-bece-(?:science-curriculum-v1|integrated-science-curriculum-v2)-/;
const genericBeceDistractors: Record<string, ReadonlySet<string>> = {
  english: new Set(["a word naming a person or thing", "a word describing an action", "a punctuation mark", "a word with the opposite meaning"]),
  rme: new Set(["a weather condition", "dishonesty", "revenge", "ignoring others"]),
  "career-technology": new Set(["a raw material", "a financial report", "a safety hazard", "a prototype"]),
  "creative-arts": new Set(["a computer cable", "a type of tool", "a punctuation mark", "a weather pattern"]),
  "social-studies": new Set(["tamale", "parliament", "urbanisation", "a natural resource"]),
  computing: new Set(["keyboard", "printer", "software", "malware"]),
  french: new Set(["red", "no", "monday", "thank you"]),
};

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
      !sciencePracticeId.test(row.questionId)
    ) return false;
    if ((row.questionType ?? "mcq") === "mcq") {
      const options = row.options.map((option) => option.trim().normalize("NFKC").toLowerCase());
      if (options.length !== 4 || options.some((option) => !option) || new Set(options).size !== 4) return false;
      if (!Number.isInteger(row.correctIndex) || row.correctIndex < 0 || row.correctIndex > 3) return false;
      const stock = genericBeceDistractors[row.topicId];
      if (row.courseSlug === "exam-bece-prep" && !row.curriculumStrand && stock &&
        options.filter((option, index) => index !== row.correctIndex && stock.has(option)).length >= 2
      ) return false;
    }
    const key = examQuestionKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
