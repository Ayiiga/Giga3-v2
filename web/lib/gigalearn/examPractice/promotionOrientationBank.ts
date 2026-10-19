/**
 * GigaLearn Teacher Promotion — free orientation practice set.
 *
 * Purpose: in-app timed practice UI (format + confidence), using publicly known
 * Ghana education-system facts written for Giga3. This is NOT an official GES
 * paper and is NOT imported from third-party mock compilations.
 */
import type { ExamPracticeQuestion, ExamPracticeSetMeta } from "./types";

export const PROMOTION_FREE_SET_META: ExamPracticeSetMeta = {
  id: "promotion-free-30",
  title: "Free 30-question practice",
  subtitle:
    "Practise the free 30 questions, see your score, and repeat them as often as you need.",
  freeLabel: "Free practice",
  questionCount: 30,
  durationMinutes: 30,
  provenanceNote:
    "GigaLearn orientation practice — not an official Ghana Education Service examination paper.",
  category: "teacher_promotion",
};

export const PROMOTION_FREE_QUESTIONS: readonly ExamPracticeQuestion[] = [
  {
    id: "p01",
    topic: "Education law",
    audience: "Both",
    stem: "In Ghana’s education system, which Act is commonly known as the Education Regulatory Bodies Act, 2020?",
    options: {
      A: "Act 778",
      B: "Act 1023",
      C: "Act 651",
      D: "Act 29",
    },
    correct: "B",
    explanation:
      "The Education Regulatory Bodies Act, 2020 is Act 1023. It establishes and strengthens regulatory bodies in the education sector.",
  },
  {
    id: "p02",
    topic: "GES governance",
    audience: "Both",
    stem: "What is the governing body of the Ghana Education Service?",
    options: {
      A: "The Education Service Council",
      B: "Parliament Select Committee only",
      C: "District Assembly alone",
      D: "Act 1049",
    },
    correct: "A",
    explanation:
      "The Education Service Council is the governing body of the Ghana Education Service.",
  },
  {
    id: "p03",
    topic: "Pre-tertiary law",
    audience: "Both",
    stem: "Which Act provides the main legal framework for pre-tertiary education in Ghana (commonly referenced as the Pre-Tertiary Education Act)?",
    options: {
      A: "Act 1023",
      B: "Act 1049",
      C: "Act 560",
      D: "Act 788",
    },
    correct: "B",
    explanation:
      "The Pre-Tertiary Education Act, 2020 is Act 1049. It covers the organisation of pre-tertiary education.",
  },
  {
    id: "p04",
    topic: "Curriculum",
    audience: "Both",
    stem: "Which national body is primarily responsible for curriculum development for pre-tertiary education in Ghana?",
    options: {
      A: "NaSIA",
      B: "NaCCA",
      C: "NAB",
      D: "NCTE",
    },
    correct: "B",
    explanation:
      "The National Council for Curriculum and Assessment (NaCCA) leads curriculum and assessment standards for pre-tertiary education.",
  },
  {
    id: "p05",
    topic: "School inspection",
    audience: "Both",
    stem: "Which agency is associated with school inspection and standards assurance at the pre-tertiary level?",
    options: {
      A: "NaSIA",
      B: "GRA",
      C: "EC",
      D: "DVLA",
    },
    correct: "A",
    explanation:
      "The National Schools Inspectorate Authority (NaSIA) focuses on inspection and standards in pre-tertiary schools.",
  },
  {
    id: "p06",
    topic: "GES structure",
    audience: "Both",
    stem: "At which level of GES administration is a District Director of Education typically placed?",
    options: {
      A: "School classroom only",
      B: "District education office",
      C: "Foreign mission",
      D: "Private company board",
    },
    correct: "B",
    explanation:
      "District Directors of Education lead GES administration at the district education office level.",
  },
  {
    id: "p07",
    topic: "SHS duration",
    audience: "Both",
    stem: "Under Ghana’s free SHS policy framework, how many years does the standard senior high school programme last?",
    options: {
      A: "Two years",
      B: "Three years",
      C: "Four years",
      D: "Five years",
    },
    correct: "B",
    explanation:
      "The standard SHS programme in Ghana is three years (with related TVET pathways also commonly organised as three years).",
  },
  {
    id: "p08",
    topic: "Promotion ranks",
    audience: "Both",
    stem: "Which of the following is a recognised GES professional rank pathway used in promotion adverts?",
    options: {
      A: "Principal Superintendent",
      B: "Chief Petty Officer",
      C: "Flight Lieutenant",
      D: "Inspector of Taxes",
    },
    correct: "A",
    explanation:
      "Principal Superintendent is among the professional ranks featured in GES promotion pathways (alongside AD and DD grades).",
  },
  {
    id: "p09",
    topic: "School leadership",
    audience: "Both",
    stem: "In a typical public basic school, who is the professional head responsible for day-to-day instructional leadership?",
    options: {
      A: "Headteacher / Head of school",
      B: "Circuit court judge",
      C: "Market queen",
      D: "Assembly member only",
    },
    correct: "A",
    explanation:
      "The headteacher (or head of school) provides day-to-day instructional and administrative leadership in the school.",
  },
  {
    id: "p10",
    topic: "Assessment",
    audience: "Both",
    stem: "What is the best description of formative assessment in classroom practice?",
    options: {
      A: "Assessment used only for final certification",
      B: "Ongoing assessment that informs teaching and learning",
      C: "A once-a-year national ranking list",
      D: "Punishment for late homework",
    },
    correct: "B",
    explanation:
      "Formative assessment is continuous feedback used to improve teaching and learning during instruction.",
  },
  {
    id: "p11",
    topic: "Inclusive education",
    audience: "Both",
    stem: "Inclusive education primarily aims to:",
    options: {
      A: "Exclude learners with disabilities from schools",
      B: "Ensure all learners can participate meaningfully in education",
      C: "Replace teachers with machines",
      D: "Abolish school rules",
    },
    correct: "B",
    explanation:
      "Inclusive education seeks meaningful participation and support for all learners, including those with special educational needs.",
  },
  {
    id: "p12",
    topic: "Professional ethics",
    audience: "Both",
    stem: "A teacher who keeps learner assessment records confidential is mainly demonstrating:",
    options: {
      A: "Professional ethics and respect for privacy",
      B: "Disobedience to school policy",
      C: "Political campaigning",
      D: "Financial auditing",
    },
    correct: "A",
    explanation:
      "Protecting learner data and assessment records is a core professional ethic in education service.",
  },
  {
    id: "p13",
    topic: "Supervision",
    audience: "Both",
    stem: "Circuit supervision in GES typically supports schools by:",
    options: {
      A: "Monitoring teaching, learning, and school improvement",
      B: "Collecting customs duties",
      C: "Issuing passports",
      D: "Running political rallies",
    },
    correct: "A",
    explanation:
      "Circuit supervisors support and monitor schools to improve teaching, learning, and compliance with education standards.",
  },
  {
    id: "p14",
    topic: "Lesson planning",
    audience: "Both",
    stem: "A good lesson plan should most clearly show:",
    options: {
      A: "Learning objectives, activities, and assessment",
      B: "Only the teacher’s personal diary",
      C: "A shopping list",
      D: "The school football score",
    },
    correct: "A",
    explanation:
      "Effective plans align objectives, learner activities, resources, and how learning will be checked.",
  },
  {
    id: "p15",
    topic: "Education policy",
    audience: "Both",
    stem: "Free SHS in Ghana is best described as a policy that:",
    options: {
      A: "Removes fees barriers to senior high / TVET access for eligible learners",
      B: "Closes all private schools",
      C: "Ends basic education",
      D: "Abolishes the teaching profession",
    },
    correct: "A",
    explanation:
      "Free SHS is a government policy aimed at expanding access by reducing fee barriers at the senior high / TVET level.",
  },
  {
    id: "p16",
    topic: "Child protection",
    audience: "Both",
    stem: "In school settings, corporal punishment is generally discouraged because it:",
    options: {
      A: "Can harm learners and contradicts child-protection best practice",
      B: "Always raises examination scores",
      C: "Is required by every subject syllabus",
      D: "Replaces the need for classroom management",
    },
    correct: "A",
    explanation:
      "Modern school practice emphasises positive discipline and child protection rather than corporal punishment.",
  },
  {
    id: "p17",
    topic: "Records",
    audience: "Both",
    stem: "An admission register in a school is primarily used to:",
    options: {
      A: "Record learners enrolled in the school",
      B: "List teacher salaries only",
      C: "Store kitchen recipes",
      D: "Track political parties",
    },
    correct: "A",
    explanation:
      "The admission register is an official record of learners admitted to the school.",
  },
  {
    id: "p18",
    topic: "Timetable",
    audience: "Both",
    stem: "A school timetable mainly helps to:",
    options: {
      A: "Organise subjects, periods, and teacher deployment across the week",
      B: "Replace the curriculum",
      C: "Set national tax rates",
      D: "Elect the District Chief Executive",
    },
    correct: "A",
    explanation:
      "Timetables allocate instructional time and staffing so teaching can run in an orderly way.",
  },
  {
    id: "p19",
    topic: "Stakeholder engagement",
    audience: "Both",
    stem: "A School Management Committee (SMC) / PTA typically supports schools by:",
    options: {
      A: "Engaging parents and community in school improvement",
      B: "Setting the Bank of Ghana policy rate",
      C: "Issuing passports",
      D: "Writing the national constitution",
    },
    correct: "A",
    explanation:
      "SMCs/PTAs mobilise parents and communities to support school development and accountability.",
  },
  {
    id: "p20",
    topic: "Learning outcomes",
    audience: "Both",
    stem: "Competency-based curriculum approaches emphasise:",
    options: {
      A: "What learners can do with knowledge and skills",
      B: "Memorising only disconnected facts with no application",
      C: "Ending all assessment",
      D: "Teaching without objectives",
    },
    correct: "A",
    explanation:
      "Competency-based approaches focus on applying knowledge, skills, and values in real contexts.",
  },
  {
    id: "p21",
    topic: "Education actors",
    audience: "Both",
    stem: "The Ministry of Education in Ghana is primarily responsible for:",
    options: {
      A: "National education policy direction and oversight",
      B: "Issuing driving licences",
      C: "Running only private shops",
      D: "Managing the armed forces",
    },
    correct: "A",
    explanation:
      "The Ministry of Education provides policy leadership and oversight for the education sector.",
  },
  {
    id: "p22",
    topic: "Teacher professionalism",
    audience: "Both",
    stem: "Continuous professional development (CPD) for teachers is important because it:",
    options: {
      A: "Helps teachers update skills and improve classroom practice",
      B: "Replaces the need for lesson preparation",
      C: "Is only for accountants",
      D: "Ends learner assessment forever",
    },
    correct: "A",
    explanation:
      "CPD keeps teachers current with pedagogy, curriculum, and professional standards.",
  },
  {
    id: "p23",
    topic: "Data use",
    audience: "Both",
    stem: "Using assessment data to re-teach a difficult topic is an example of:",
    options: {
      A: "Data-informed instruction",
      B: "Ignoring learner needs",
      C: "Financial mismanagement",
      D: "Political interference",
    },
    correct: "A",
    explanation:
      "Teachers use evidence from assessments to adjust instruction and support learning gaps.",
  },
  {
    id: "p24",
    topic: "Equity",
    audience: "Both",
    stem: "Providing learning support for girls and boys in underserved communities mainly advances:",
    options: {
      A: "Equity and access in education",
      B: "School closure",
      C: "Examination malpractice",
      D: "Teacher absenteeism",
    },
    correct: "A",
    explanation:
      "Equity-focused actions widen meaningful access to quality learning for underserved groups.",
  },
  {
    id: "p25",
    topic: "School safety",
    audience: "Both",
    stem: "A clear emergency assembly point on a school compound mainly supports:",
    options: {
      A: "Learner and staff safety during emergencies",
      B: "Faster marking of scripts only",
      C: "Higher school fees automatically",
      D: "Shorter school holidays",
    },
    correct: "A",
    explanation:
      "Emergency preparedness (including assembly points) protects lives during fires, drills, or other incidents.",
  },
  {
    id: "p26",
    topic: "Communication",
    audience: "Both",
    stem: "When communicating a policy change to teachers, a District Director should prioritise:",
    options: {
      A: "Clear, timely, and accurate information through official channels",
      B: "Rumour only",
      C: "Silence until after exams forever",
      D: "Social media insults",
    },
    correct: "A",
    explanation:
      "Effective education leadership communicates policy changes clearly and through proper channels.",
  },
  {
    id: "p27",
    topic: "Resource management",
    audience: "Both",
    stem: "Transparent recording of capitation / school grants spending mainly promotes:",
    options: {
      A: "Accountability and trust",
      B: "Hidden procurement",
      C: "Examination leakage",
      D: "Teacher demotivation as a goal",
    },
    correct: "A",
    explanation:
      "Transparent financial records strengthen accountability to government, parents, and communities.",
  },
  {
    id: "p28",
    topic: "Guidance",
    audience: "Both",
    stem: "School guidance and counselling services primarily help learners with:",
    options: {
      A: "Academic, personal, and career support",
      B: "Collecting market tolls",
      C: "Building highways",
      D: "Issuing land titles",
    },
    correct: "A",
    explanation:
      "Guidance and counselling support learners’ academic progress, wellbeing, and career decisions.",
  },
  {
    id: "p29",
    topic: "Quality assurance",
    audience: "Both",
    stem: "Regular lesson observation with constructive feedback is mainly a tool for:",
    options: {
      A: "Improving teaching quality",
      B: "Punishing learners only",
      C: "Closing the school kitchen",
      D: "Cancelling the curriculum",
    },
    correct: "A",
    explanation:
      "Supportive observation and feedback help teachers reflect and improve instructional practice.",
  },
  {
    id: "p30",
    topic: "Practice integrity",
    audience: "Both",
    stem: "On GigaLearn, free orientation practice questions should be treated as:",
    options: {
      A: "Study practice to build confidence — not as an official GES examination paper",
      B: "A guaranteed promotion certificate",
      C: "A WAEC BECE paper",
      D: "A substitute for professional conduct",
    },
    correct: "A",
    explanation:
      "GigaLearn free promotion practice is an orientation / revision format. Official promotion exams are administered by the appropriate authorities.",
  },
] as const;

export function getPromotionFreeQuestions(): ExamPracticeQuestion[] {
  return [...PROMOTION_FREE_QUESTIONS];
}
