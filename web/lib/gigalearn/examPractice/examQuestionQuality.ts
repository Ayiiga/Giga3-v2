import type { TechBankQuestion } from "../academy/techBanks/techBankTypes";

const generatedBeceLeadIn = /^(?:which statement best explains the concept in this question|choose the best answer about this topic|why is the following concept useful in everyday life or learning):\s*/i;
const generatedSocialStudiesLeadIn = /^(?:During a school project in [^.]+, learners investigate the situation\.\s*|A local radio discussion raises the concern that\s+|A district planning team receives a report that\s+|During a community clean-up, volunteers realise that\s+|An assembly member is asked to explain why\s+)/i;
const retiredBeceItems = new Set([153, 154, 155, 157, 158, 160, 161, 163, 212, 218, 219, 304, 307, 309, 310, 311, 312, 313, 314, 315, 319, 320, 356, 365, 366].map((n) => `exam-bece-prep-q${n}`));
const retiredWassceScienceItems = new Set(["q012", "q107", "q108", "q110", "q139"].map((id) => `exam-wassce-integrated-science-${id}`));
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

export function normalizeExamQuestionStem(row: TechBankQuestion): TechBankQuestion {
  if (row.courseSlug !== "exam-wassce-social-studies") return row;
  const stem = row.questionText.replace(generatedSocialStudiesLeadIn, "");
  return stem === row.questionText ? row : { ...row, questionText: stem.charAt(0).toUpperCase() + stem.slice(1) };
}

export function selectQualityExamQuestions(rows: TechBankQuestion[]): TechBankQuestion[] {
  const seen = new Set<string>();
  return rows.map(normalizeExamQuestionStem).filter((row) => {
    if (generatedBeceLeadIn.test(row.questionText)) return false;
    if (retiredBeceItems.has(row.questionId) || retiredWassceScienceItems.has(row.questionId)) return false;
    if (row.topicId === "french" && /^Which French expression means .* in the context of the question:/i.test(row.questionText)) return false;
    if (row.courseSlug === "exam-bece-prep" && row.topicId === "computing" &&
      /^exam-bece-prep-q(?:25[1-9]|26[0-9]|270)$/.test(row.questionId)
    ) return false;
    if (row.courseSlug === "exam-wassce-english" &&
      /^(?:A nurse tells a patient, 'Take this medicine after meals|Unless you ____ regularly, you may struggle)/.test(row.questionText)
    ) return false;
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
