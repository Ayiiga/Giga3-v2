import type {
  CreationInputs,
  CreationStage,
  CreationTemplate,
  CreationTemplateId,
  IntakeField,
} from "@/lib/gigalearn/creation/types";

export const ORIGINALITY_RULES: string[] = [
  "Write entirely original Giga3 text. Do not reproduce wording, paragraphs, examples, quotations or distinctive expressions from any reference document, curriculum page, textbook, song or book.",
  "Reference material supplied by the user may only guide STRUCTURE (section order, field types) and short factual codes such as a strand name or indicator code.",
  "Never describe the output as copyright-free, and never state or imply that it is produced, approved or endorsed by GES, NaCCA, the Ministry of Education or any other official body.",
  "Do not invent facts about the user, their school, learners, employers, qualifications or results. Where a detail is missing, write a clear placeholder in square brackets, e.g. [Add your school name].",
];

export const RESEARCH_INTEGRITY_RULES: string[] = [
  "Never fabricate respondents, interviews, quotations, survey results, statistics, field observations or citations.",
  "Never claim that research, data collection or analysis was carried out unless the user supplied that data in this request.",
  "Where numbers or findings are required but were not supplied, write placeholders such as [Insert your sample size] instead of values.",
  "Do not invent specific references (authors, years, titles, DOIs). Reproduce user-supplied references exactly. Otherwise, under the heading 'Sources to find and verify', describe the kinds of sources and search keywords to look for, clearly marked as not verified by Giga3.",
];

export const CCP_CORE_COMPETENCIES = [
  "Critical thinking & problem solving",
  "Creativity & innovation",
  "Communication & collaboration",
  "Cultural identity & global citizenship",
  "Personal development & leadership",
  "Digital literacy",
];

/** Foundational literacies emphasised by the Ghana CCP (the "4Rs"), exposed as a configurable field. */
export const CCP_FOUNDATIONAL_SKILLS = ["Reading", "Writing", "Arithmetic", "Creativity"];

export const LEVEL_OPTIONS = [
  "KG 1",
  "KG 2",
  "Basic 1",
  "Basic 2",
  "Basic 3",
  "Basic 4",
  "Basic 5",
  "Basic 6",
  "Basic 7 / JHS 1",
  "Basic 8 / JHS 2",
  "Basic 9 / JHS 3",
  "Basic 10 / SHS 1",
  "Basic 11 / SHS 2",
  "Basic 12 / SHS 3",
  "Tertiary",
  "Adult learners",
];

export const SUBJECT_OPTIONS = [
  "English Language",
  "Mathematics",
  "Science",
  "Social Studies",
  "Computing",
  "Career Technology",
  "Creative Arts & Design",
  "Religious & Moral Education",
  "Physical & Health Education",
  "Ghanaian Language",
  "French",
  "Arabic",
  "History",
];

export const TEACHING_APPROACHES = [
  "Inquiry-based",
  "Collaborative",
  "Project-based",
  "Demonstration",
  "Discussion",
  "Practical activity",
  "Differentiated learning",
  "Mixed approach",
];

export const ASSESSMENT_TYPES = [
  "Class exercise",
  "Quiz",
  "Practical task",
  "Oral questions",
  "Written questions",
  "Exit ticket",
];

export const LESSON_STRUCTURE = [
  "Lesson title",
  "Subject, class/level and duration",
  "Strand and sub-strand",
  "Content standard and indicator",
  "Learning objective and learning outcomes",
  "Core competencies",
  "Key vocabulary",
  "Prior knowledge",
  "Teaching/learning resources",
  "Introduction and starter activity",
  "Teacher activity and learner activity",
  "Guided practice",
  "Independent practice",
  "Differentiation",
  "Assessment for, as and of learning",
  "Closure",
  "Homework/extension",
  "Teacher reflection",
];

const LESSON_FIELDS: IntakeField[] = [
  {
    id: "subject",
    label: "Subject",
    question: "What subject are you teaching?",
    kind: "choice",
    options: SUBJECT_OPTIONS,
    allowCustom: true,
    required: true,
    askUpfront: true,
  },
  {
    id: "level",
    label: "Level",
    question: "What class or level is this for?",
    kind: "choice",
    options: LEVEL_OPTIONS,
    allowCustom: true,
    required: true,
    askUpfront: true,
  },
  {
    id: "topic",
    label: "Topic",
    question: "What topic should learners study?",
    kind: "text",
    placeholder: "e.g. States of matter",
    required: true,
    askUpfront: true,
  },
  {
    id: "duration",
    label: "Duration",
    question: "How long is the lesson?",
    kind: "choice",
    options: ["30 minutes", "35 minutes", "40 minutes", "60 minutes", "70 minutes", "80 minutes"],
    allowCustom: true,
    required: true,
    askUpfront: true,
  },
  {
    id: "curriculumReference",
    label: "Curriculum alignment",
    question:
      "If you have a curriculum standard, indicator or learning outcome, provide it. You can also leave this empty and Giga3 will suggest an appropriate structure.",
    kind: "longtext",
    placeholder: "e.g. Strand: Diversity of matter · Indicator code from your curriculum",
    required: false,
    askUpfront: true,
  },
  {
    id: "learnerContext",
    label: "Learner context",
    question: "Is this for a particular school, community or learner group?",
    kind: "longtext",
    placeholder: "e.g. Rural school, 45 learners, mixed abilities",
    required: false,
    askUpfront: true,
  },
  {
    id: "resources",
    label: "Resources",
    question: "What materials or resources are available?",
    kind: "longtext",
    placeholder: "e.g. Water, cups, ice, a candle, chalkboard",
    required: false,
    askUpfront: true,
  },
  {
    id: "approach",
    label: "Approach",
    question: "Which teaching approach should the lesson use?",
    kind: "choice",
    options: TEACHING_APPROACHES,
    required: true,
    askUpfront: true,
  },
  {
    id: "assessment",
    label: "Assessment",
    question: "How should learners be assessed?",
    kind: "multichoice",
    options: ASSESSMENT_TYPES,
    allowCustom: true,
    required: true,
    askUpfront: true,
  },
  {
    id: "documentKind",
    label: "Document",
    question: "What should Giga3 create?",
    kind: "choice",
    options: ["Lesson plan", "Lesson note", "Teaching resource", "Weekly scheme of learning"],
    defaultValue: "Lesson plan",
    required: true,
    askUpfront: false,
  },
  { id: "strand", label: "Strand", question: "Strand", kind: "text", required: false, askUpfront: false },
  { id: "subStrand", label: "Sub-strand", question: "Sub-strand", kind: "text", required: false, askUpfront: false },
  {
    id: "contentStandard",
    label: "Content standard",
    question: "Content standard",
    kind: "text",
    required: false,
    askUpfront: false,
  },
  { id: "indicator", label: "Indicator", question: "Indicator", kind: "text", required: false, askUpfront: false },
  {
    id: "coreCompetencies",
    label: "Core competencies",
    question: "Which core competencies should the lesson develop?",
    kind: "multichoice",
    options: CCP_CORE_COMPETENCIES,
    required: false,
    askUpfront: false,
  },
  {
    id: "foundationalSkills",
    label: "Foundational skills (4Rs)",
    question: "Which foundational skills should the lesson reinforce?",
    kind: "multichoice",
    options: CCP_FOUNDATIONAL_SKILLS,
    required: false,
    askUpfront: false,
  },
  {
    id: "curriculumIssuer",
    label: "Curriculum source",
    question: "Who issued the curriculum you referenced?",
    kind: "choice",
    options: ["Ghana Education Service / Ministry of Education (CCP)"],
    allowCustom: true,
    required: false,
    askUpfront: false,
  },
];

const RESEARCH_FIELDS: IntakeField[] = [
  {
    id: "topic",
    label: "Topic",
    question: "What is your research topic?",
    kind: "text",
    required: true,
    askUpfront: true,
  },
  {
    id: "problem",
    label: "Problem",
    question: "What problem are you investigating?",
    kind: "longtext",
    required: true,
    askUpfront: true,
  },
  {
    id: "studyArea",
    label: "Study area",
    question: "Where is the study taking place?",
    kind: "text",
    placeholder: "e.g. A named district, municipality or institution",
    required: true,
    askUpfront: true,
  },
  {
    id: "population",
    label: "Target population",
    question: "Who is your target population?",
    kind: "text",
    placeholder: "e.g. Basic 8 learners in public schools",
    required: true,
    askUpfront: true,
  },
  {
    id: "academicLevel",
    label: "Academic level",
    question: "What level is this research for?",
    kind: "choice",
    options: ["Diploma", "Undergraduate", "Postgraduate diploma", "Masters", "Doctoral", "Action research (teacher)"],
    allowCustom: true,
    required: false,
    askUpfront: true,
  },
  {
    id: "design",
    label: "Research design",
    question: "Which research design are you using?",
    kind: "choice",
    options: ["Qualitative", "Quantitative", "Mixed methods", "Not sure yet — suggest one"],
    required: false,
    askUpfront: true,
  },
  {
    id: "sampleSize",
    label: "Sample size",
    question: "What is your actual sample size?",
    kind: "number",
    min: 1,
    required: false,
    askUpfront: false,
  },
  {
    id: "samplingProcedure",
    label: "Sampling procedure",
    question: "How did (or will) you select participants?",
    kind: "longtext",
    required: false,
    askUpfront: false,
  },
  {
    id: "instruments",
    label: "Instruments",
    question: "What data collection instruments are you using?",
    kind: "longtext",
    placeholder: "e.g. Questionnaire, interview guide, observation checklist",
    required: false,
    askUpfront: false,
  },
  {
    id: "collectedData",
    label: "Collected data",
    question: "Please provide your collected data (summary tables, counts or key responses).",
    kind: "longtext",
    required: false,
    askUpfront: false,
  },
  {
    id: "references",
    label: "Your references",
    question: "Paste the references you have actually read (one per line).",
    kind: "longtext",
    required: false,
    askUpfront: false,
  },
];

const RESEARCH_STAGES: CreationStage[] = [
  {
    id: "introduction",
    label: "title, background and problem statement",
    sections: ["Title", "Introduction", "Background to the study", "Statement of the problem"],
    instruction:
      "Write Chapter One (part 1): a working title, a short introduction, the background to the study and the statement of the problem, using only the user's topic, problem, study area and population.",
  },
  {
    id: "objectives",
    label: "research objectives and questions",
    sections: [
      "Purpose of the study",
      "Research objectives",
      "Research questions",
      "Scope of the study",
      "Significance of the study",
      "Limitations",
      "Organisation of the study",
    ],
    instruction:
      "Write Chapter One (part 2): purpose, 3–4 specific objectives, matching research questions, scope, significance, likely limitations and the organisation of a five-chapter study.",
  },
  {
    id: "literature",
    label: "literature review structure",
    sections: [
      "Introduction",
      "Conceptual review",
      "Theoretical review",
      "Empirical review",
      "Conceptual framework",
    ],
    instruction:
      "Write a Chapter Two STRUCTURE: for each subsection give its purpose, the key concepts or theories the user should read about, and guiding points. Mark every place a citation is needed as [Citation needed — add a source you have read]. Do not invent studies or findings.",
  },
  {
    id: "methodology",
    label: "methodology",
    sections: [
      "Research design",
      "Study area",
      "Population",
      "Sample and sampling procedure",
      "Data sources",
      "Instruments",
      "Data collection procedure",
      "Data processing and analysis",
      "Ethical considerations",
    ],
    instruction:
      "Write Chapter Three using the user's design, sample size, sampling procedure and instruments exactly as supplied.",
    requires: ["sampleSize", "samplingProcedure", "instruments"],
    requiresMessage:
      "I need your actual sample size, sampling procedure and instruments before I can generate the methodology.",
  },
  {
    id: "results",
    label: "results and analysis",
    sections: ["Results", "Analysis", "Tables/charts"],
    instruction:
      "Write Chapter Four results strictly from the data the user supplied. Present tables only from supplied numbers. Do not extrapolate or add findings.",
    requires: ["collectedData"],
    requiresMessage: "Please provide your collected data before I generate the results.",
    userDataStage: true,
  },
  {
    id: "discussion",
    label: "discussion",
    sections: ["Discussion of findings"],
    instruction:
      "Discuss only the findings presented in the results section. Relate them to the objectives. Where comparison with literature is appropriate, write [Compare with a source you have read] rather than inventing studies.",
    dependsOnFindings: true,
  },
  {
    id: "conclusions",
    label: "conclusions and recommendations",
    sections: ["Summary", "Conclusions", "Recommendations", "Areas for further research"],
    instruction: "Write Chapter Five based only on the earlier chapters.",
    dependsOnFindings: true,
  },
  {
    id: "references",
    label: "references and preliminary pages",
    sections: ["Title page", "Declaration", "Acknowledgement", "Abstract", "Table of contents", "References"],
    instruction:
      "Draft preliminary page templates with placeholders for names, institution and dates, an abstract based on the chapters above, a table of contents, and the reference list: reproduce the user's references exactly; if none were supplied, add a 'Sources to find and verify' list instead of citations.",
  },
];

const BOOK_FIELDS: IntakeField[] = [
  { id: "title", label: "Title", question: "What is the title?", kind: "text", required: true, askUpfront: true },
  { id: "subject", label: "Subject", question: "What is the subject?", kind: "text", required: true, askUpfront: true },
  {
    id: "audience",
    label: "Audience",
    question: "Who is the audience?",
    kind: "text",
    placeholder: "e.g. Basic 5 learners, new teachers, small business owners",
    required: true,
    askUpfront: true,
  },
  { id: "purpose", label: "Purpose", question: "What is the purpose?", kind: "longtext", required: true, askUpfront: true },
  {
    id: "tone",
    label: "Tone",
    question: "What tone should it use?",
    kind: "choice",
    options: ["Warm and simple", "Formal", "Conversational", "Inspirational", "Technical"],
    allowCustom: true,
    required: true,
    askUpfront: true,
  },
  {
    id: "chapterCount",
    label: "Chapters",
    question: "How many chapters?",
    kind: "number",
    min: 1,
    max: 30,
    required: true,
    askUpfront: true,
  },
  {
    id: "chapterPlan",
    label: "Chapter plan",
    question: "What should each chapter cover? (one line per chapter — leave empty for a suggested outline)",
    kind: "longtext",
    required: false,
    askUpfront: true,
  },
  {
    id: "genre",
    label: "Type",
    question: "What kind of book is it?",
    kind: "choice",
    options: ["Educational", "Fiction", "Technical", "Devotional", "Business", "Children's"],
    allowCustom: true,
    required: true,
    askUpfront: true,
  },
  {
    id: "originalIdeas",
    label: "Your ideas",
    question: "What original ideas or material do you want included?",
    kind: "longtext",
    hint: "Describe the ideas you want to teach, and Giga3 will create an original work.",
    required: false,
    askUpfront: true,
  },
];

function bookStages(inputs: CreationInputs): CreationStage[] {
  const raw = Number(Array.isArray(inputs.chapterCount) ? inputs.chapterCount[0] : inputs.chapterCount);
  const count = Number.isFinite(raw) ? Math.min(30, Math.max(1, Math.round(raw))) : 1;
  const plan = String(inputs.chapterPlan ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const chapters: CreationStage[] = Array.from({ length: count }, (_, i) => ({
    id: `chapter-${i + 1}`,
    label: `chapter ${i + 1}`,
    sections: [`Chapter ${i + 1}`],
    instruction: `Write Chapter ${i + 1} in full${plan[i] ? ` covering: ${plan[i]}` : ", following the table of contents"}. Add activities or reflection questions where appropriate for the audience.`,
  }));
  return [
    {
      id: "front-matter",
      label: "title, preface, introduction and table of contents",
      sections: ["Title", "Subtitle", "Preface", "Introduction", "Table of contents"],
      instruction: "Write the front matter and a chapter-by-chapter table of contents with one-line summaries.",
    },
    ...chapters,
    {
      id: "back-matter",
      label: "conclusion, glossary and references",
      sections: ["Conclusion", "Glossary", "References (where applicable)"],
      instruction:
        "Write the conclusion and a glossary of key terms used. Only list references the user supplied; otherwise omit references or add 'Sources to find and verify'.",
    },
  ];
}

const CV_FIELDS: IntakeField[] = [
  { id: "fullName", label: "Full name", question: "What is your full name?", kind: "text", required: true, askUpfront: true, personalData: true },
  {
    id: "professionalTitle",
    label: "Professional title",
    question: "What is your professional title?",
    kind: "text",
    placeholder: "e.g. Basic School Science Teacher",
    required: true,
    askUpfront: true,
  },
  {
    id: "contact",
    label: "Contact information",
    question: "Which contact details should appear on your CV?",
    kind: "longtext",
    hint: "Only include what you want employers to see.",
    required: false,
    askUpfront: true,
    personalData: true,
  },
  {
    id: "objective",
    label: "Objective",
    question: "What role or opportunity are you applying for?",
    kind: "text",
    required: false,
    askUpfront: true,
  },
  { id: "skills", label: "Skills", question: "List your key skills.", kind: "longtext", required: true, askUpfront: true },
  {
    id: "experience",
    label: "Work experience",
    question: "Describe your work experience (role, organisation, dates, what you did).",
    kind: "longtext",
    required: false,
    askUpfront: true,
    personalData: true,
  },
  {
    id: "education",
    label: "Education",
    question: "List your education (qualification, institution, year).",
    kind: "longtext",
    required: true,
    askUpfront: true,
    personalData: true,
  },
  { id: "certifications", label: "Certifications", question: "Any certifications or licences?", kind: "longtext", required: false, askUpfront: true },
  { id: "projects", label: "Projects", question: "Any projects you want to highlight?", kind: "longtext", required: false, askUpfront: true },
  { id: "achievements", label: "Achievements", question: "Any achievements or awards?", kind: "longtext", required: false, askUpfront: true },
  { id: "leadership", label: "Leadership", question: "Any leadership roles?", kind: "longtext", required: false, askUpfront: true },
  { id: "volunteer", label: "Volunteer experience", question: "Any volunteer experience?", kind: "longtext", required: false, askUpfront: true },
  {
    id: "references",
    label: "References",
    question: "How should references appear?",
    kind: "choice",
    options: ["Available on request", "List my referees", "Leave out"],
    defaultValue: "Available on request",
    required: true,
    askUpfront: true,
  },
  {
    id: "refereeDetails",
    label: "Referee details",
    question: "Referee details (only with their permission).",
    kind: "longtext",
    required: false,
    askUpfront: false,
    personalData: true,
  },
];

const QUIZ_FIELDS: IntakeField[] = [
  { ...LESSON_FIELDS[0]!, question: "What subject is the quiz for?" },
  { ...LESSON_FIELDS[1]! },
  { ...LESSON_FIELDS[2]!, question: "What topic should the questions cover?" },
  {
    id: "questionCount",
    label: "Questions",
    question: "How many questions?",
    kind: "choice",
    options: ["5", "10", "15", "20"],
    allowCustom: true,
    required: true,
    askUpfront: true,
  },
  {
    id: "questionTypes",
    label: "Question types",
    question: "Which question types?",
    kind: "multichoice",
    options: ["Multiple choice", "True/False", "Fill in the blank", "Short answer", "Matching", "Practical activity"],
    required: true,
    askUpfront: true,
  },
  {
    id: "difficulty",
    label: "Difficulty",
    question: "What difficulty level?",
    kind: "choice",
    options: ["Easy", "Medium", "Challenging", "Mixed"],
    required: true,
    askUpfront: true,
  },
  {
    id: "answerKey",
    label: "Answer key",
    question: "Include an answer key with explanations?",
    kind: "choice",
    options: ["Yes", "No"],
    defaultValue: "Yes",
    required: true,
    askUpfront: false,
  },
];

export const RHYME_CATEGORY_LABELS = [
  "Alphabet",
  "Numbers & Counting",
  "Fruits & Vegetables",
  "African Animals",
  "Colours",
  "Health & Hygiene",
  "Good Manners",
  "School",
  "Nature & Environment",
  "Movement & Actions",
  "African Languages",
  "Ghana & African Culture",
] as const;

const RHYME_FIELDS: IntakeField[] = [
  {
    id: "category",
    label: "Category",
    question: "Which GigaRhymes category?",
    kind: "choice",
    options: [...RHYME_CATEGORY_LABELS],
    required: true,
    askUpfront: true,
  },
  {
    id: "ageRange",
    label: "Age range",
    question: "How old are the learners?",
    kind: "choice",
    options: ["2–4 years", "4–6 years", "6–8 years", "8–10 years"],
    required: true,
    askUpfront: true,
  },
  {
    id: "learningObjective",
    label: "Learning objective",
    question: "What should learners know or do after the rhyme?",
    kind: "text",
    placeholder: "e.g. Count from 1 to 5",
    required: true,
    askUpfront: true,
  },
  {
    id: "language",
    label: "Language",
    question: "Which language should the rhyme use?",
    kind: "choice",
    options: [
      "English",
      "English + Twi (Akan, Ghana)",
      "English + Ewe (Ghana/Togo)",
      "English + Ga (Ghana)",
      "English + Dagbani (Ghana)",
      "English + Hausa (West Africa)",
      "English + Yoruba (Nigeria)",
      "English + Swahili (East Africa)",
    ],
    defaultValue: "English",
    required: true,
    askUpfront: true,
  },
  {
    id: "culturalContext",
    label: "Cultural context",
    question: "Is there a specific place or cultural setting? (optional)",
    kind: "text",
    placeholder: "e.g. Market day in a Ghanaian town",
    required: false,
    askUpfront: true,
  },
];

export const CREATION_TEMPLATES: CreationTemplate[] = [
  {
    id: "lesson",
    label: "Lesson Builder",
    emoji: "📚",
    tagline: "Create lesson notes, lesson plans and teaching activities.",
    documentNoun: "lesson",
    backendToolId: "creation-lesson",
    fields: LESSON_FIELDS,
    stages: [
      {
        id: "lesson",
        label: "lesson",
        sections: LESSON_STRUCTURE,
        instruction:
          "Write the complete document using the structure listed. Use practical, low-cost activities suitable for the learner context and resources. Include differentiation for learners who need support and for learners who need challenge.",
      },
    ],
    integrityRules: ORIGINALITY_RULES,
  },
  {
    id: "research",
    label: "Research Builder",
    emoji: "🔬",
    tagline: "Build your research project step by step.",
    documentNoun: "research project",
    backendToolId: "creation-research",
    fields: RESEARCH_FIELDS,
    stages: RESEARCH_STAGES,
    integrityRules: [...ORIGINALITY_RULES, ...RESEARCH_INTEGRITY_RULES],
  },
  {
    id: "book",
    label: "Book Builder",
    emoji: "📖",
    tagline: "Develop an original book chapter by chapter.",
    documentNoun: "book",
    backendToolId: "creation-book",
    fields: BOOK_FIELDS,
    stages: bookStages,
    integrityRules: [
      ...ORIGINALITY_RULES,
      "If the user names an existing book as inspiration, do not reproduce, summarise chapter-by-chapter or closely paraphrase it. Build an original work from the user's own ideas.",
    ],
  },
  {
    id: "cv",
    label: "CV Builder",
    emoji: "📄",
    tagline: "Create a professional CV from your own information.",
    documentNoun: "CV",
    backendToolId: "creation-cv",
    fields: CV_FIELDS,
    stages: [
      {
        id: "cv",
        label: "CV",
        sections: [
          "Name and professional title",
          "Contact information",
          "Professional summary",
          "Objective",
          "Skills",
          "Work experience",
          "Education",
          "Certifications",
          "Projects",
          "Achievements",
          "Leadership",
          "Volunteer experience",
          "References",
        ],
        instruction:
          "Format a clean, professional CV. Use ONLY the details the user supplied — polish wording but never add employers, dates, qualifications, metrics or skills they did not give. Omit sections the user left empty.",
      },
    ],
    integrityRules: ORIGINALITY_RULES,
  },
  {
    id: "rhyme",
    label: "GigaRhymes",
    emoji: "🎵",
    tagline: "Create original educational African-centred rhymes.",
    documentNoun: "rhyme",
    backendToolId: "creation-rhyme",
    fields: RHYME_FIELDS,
    stages: [
      {
        id: "rhyme",
        label: "rhyme",
        sections: ["Title", "Learning objective", "Lyrics", "Clap-along guide", "Questions", "Activities"],
        instruction:
          "Write one short original rhyme (4–12 lines, one line per bullet under '## Lyrics'), then a clap-along guide, three simple questions with answers and two activities.",
      },
    ],
    integrityRules: [
      ...ORIGINALITY_RULES,
      "The rhyme must be entirely new: do not copy, translate, closely paraphrase or imitate the lyrics, titles, distinctive phrases, melodies or recognisable line structures of any existing song, nursery rhyme or social-media video.",
      "Be culturally specific without treating Africa as one culture: name the language, region and cultural context you use. Do not label every African element as Ghanaian.",
      "Mark any African-language lines with '(needs native-speaker review)'.",
    ],
  },
  {
    id: "quiz",
    label: "Quiz Builder",
    emoji: "📝",
    tagline: "Create questions, answers and learning activities.",
    documentNoun: "quiz",
    backendToolId: "creation-quiz",
    fields: QUIZ_FIELDS,
    stages: [
      {
        id: "quiz",
        label: "quiz",
        sections: ["Instructions", "Questions", "Answer key", "Follow-up activity"],
        instruction:
          "Write the quiz with numbered questions in the requested types and difficulty, then the answer key with a one-line explanation per answer if requested, and one follow-up learning activity.",
      },
    ],
    integrityRules: ORIGINALITY_RULES,
  },
];

export function getCreationTemplate(id: string): CreationTemplate | undefined {
  return CREATION_TEMPLATES.find((template) => template.id === id);
}

export function isCreationTemplateId(id: string): id is CreationTemplateId {
  return CREATION_TEMPLATES.some((template) => template.id === id);
}

export function stagesFor(template: CreationTemplate, inputs: CreationInputs): CreationStage[] {
  return typeof template.stages === "function" ? template.stages(inputs) : template.stages;
}
