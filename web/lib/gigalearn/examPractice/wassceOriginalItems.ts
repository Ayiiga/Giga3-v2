import type { TechBankQuestion } from "../academy/techBanks/techBankTypes";

const subjects = {
  "wassce-english": {
    label: "English Language",
    items: [
      ["Comprehension", "Inference", "The chairperson thanked members for their ‘remarkable punctuality’ after starting the meeting half an hour late because most seats were empty. What is the likely effect of the quoted expression?", "It criticises the late arrivals through irony.", "It praises the members who arrived late.", "It blames the chairperson for ending the meeting early.", "It signals that the meeting time was changed.", "The apparent praise contradicts the circumstances and is used to criticise lateness."],
      ["Lexis and Structure", "Sentence interpretation", "Which sentence has the same meaning as ‘Had the driver checked the fuel gauge, the bus would not have stopped’?", "The driver did not check the gauge, and the bus stopped.", "The driver checked the gauge after the bus stopped.", "The driver checked the gauge, but the bus still stopped.", "The bus stopped so that the driver could check the gauge.", "The inverted conditional describes an unreal past condition and an outcome that could have been avoided."],
      ["Summary", "Selecting main ideas", "Market vendors moved their goods indoors after heavy rain damaged several outdoor stalls. Which summary retains the main action and its reason?", "Rain damage to outdoor stalls prompted vendors to move their goods indoors.", "Vendors moved their goods indoors so that repairs could begin.", "Heavy rain damaged the goods after vendors moved them indoors.", "Vendors moved outdoors after rain damaged indoor stalls.", "The summary keeps the move and its stated cause without adding repairs or changing what was damaged."],
    ],
  },
  "wassce-core-mathematics": {
    label: "Core Mathematics",
    items: [
      ["Number", "Sets", "Of 48 learners, 30 study French, 25 study ICT and five study neither. How many study both?", "12", "7", "18", "43", "43 study at least one subject. The overlap is 30 + 25 − 43 = 12."],
      ["Number", "Indices", "If 3 raised to the power 2x equals 81, find x.", "2", "4", "9", "40.5", "81 equals 3 raised to the fourth power, so 2x = 4 and x = 2."],
      ["Algebra", "Simultaneous equations", "Two exercise books and one pen cost GH₵19. One exercise book and two pens cost GH₵14. What is the cost of one exercise book?", "GH₵8", "GH₵3", "GH₵5", "GH₵11", "Let the prices be b and p. Eliminating p from 2b + p = 19 and b + 2p = 14 gives 3b = 24."],
      ["Algebra", "Linear inequalities", "Which interval is the solution of 4 − 3x ≥ 10?", "x ≤ −2", "x ≥ −2", "x ≤ 2", "x ≥ 2", "Subtract 4 to get −3x ≥ 6. Dividing by −3 reverses the sign, giving x ≤ −2."],
      ["Geometry and Mensuration", "Similarity", "Two similar solids have corresponding lengths in the ratio 2:3. If the smaller solid has volume 40 cm³, find the larger volume.", "135 cm³", "60 cm³", "90 cm³", "120 cm³", "The volume scale factor is (3/2)³ = 27/8. Multiply 40 by 27/8 to get 135."],
      ["Geometry and Mensuration", "Coordinate geometry", "A line passes through (2, 3) and (6, 11). What is its equation?", "y = 2x − 1", "y = 2x + 1", "y = 4x − 5", "y = x + 1", "The gradient is (11 − 3)/(6 − 2) = 2. Substituting (2, 3) gives intercept −1."],
      ["Statistics and Probability", "Grouped data", "The intervals 0–9, 10–19 and 20–29 have frequencies 3, 7 and 5 respectively. Which interval contains the median observation?", "10–19", "0–9", "20–29", "The median is exactly 19", "There are 15 observations, so the median is the eighth. The second interval contains positions 4 through 10."],
      ["Algebra", "Sequences", "The first three terms of a geometric sequence are 5, 15 and 45. What is the sum of the first four terms?", "200", "135", "180", "160", "The ratio is 3, so the fourth term is 135. The sum is 5 + 15 + 45 + 135 = 200."],
      ["Algebra", "Quadratic equations", "A rectangle has a perimeter of 34 cm and an area of 60 cm². What is the length of its longer side?", "12 cm", "10 cm", "15 cm", "17 cm", "The sides sum to 17 and multiply to 60. The pair 5 and 12 satisfies both conditions."],
      ["Geometry and Mensuration", "Trigonometry", "A rope of length 10 m runs from the ground to the top of a vertical pole. If it makes a 60° angle with level ground, how high is the pole?", "5√3 m", "5 m", "10√3 m", "10/√3 m", "Height is opposite the angle, so it equals 10 sin 60°, or 5√3 m."],
      ["Statistics and Probability", "Dependent events", "A bag contains five red and three blue counters. Two are drawn without replacement. What is the probability that both are red?", "5/14", "25/64", "5/8", "3/14", "Multiply 5/8 by 4/7. The second draw has four red counters left out of seven."],
    ],
  },
  "wassce-integrated-science": {
    label: "Integrated Science",
    items: [
      ["Chemistry", "Acids and bases", "A student dilutes a solution of pH 3 with distilled water. Which change is expected during moderate dilution?", "The pH rises towards 7.", "The pH falls towards 0.", "The pH immediately rises above 7.", "The pH remains exactly 3.", "Dilution lowers the concentration of hydrogen ions. The pH rises towards neutral."],
      ["Biology", "Inheritance", "A plant with genotype Tt is crossed with a plant with genotype tt. If T is completely dominant, what fraction of offspring is expected to show the recessive trait?", "1/2", "1/4", "3/4", "1", "The Tt parent supplies T or t. The tt parent supplies only t. Half the offspring are expected to be tt."],
      ["Agricultural Science", "Soil and crop production", "Two plots have the same crop and rainfall, but one is sandy and dries quickly after watering. Which treatment most directly improves water retention?", "Mix mature compost into the sandy plot.", "Mix more coarse sand into the sandy plot.", "Remove plant residues and topsoil from the sandy plot.", "Compact the sandy plot heavily before planting.", "Organic matter helps sandy soil hold moisture. Adding coarse sand or removing topsoil does not improve its organic matter content."],
    ],
  },
  "wassce-social-studies": {
    label: "Social Studies",
    items: [
      ["Governance, Politics and Stability", "Accountability", "A district assembly publishes a market project’s budget and holds public meetings on expenditure. What makes this an accountability measure?", "Residents can compare reported spending with the approved plan.", "Contractors can amend the budget without informing the assembly.", "Residents take over responsibility for paying contractors.", "The assembly no longer needs to record procurement decisions.", "Budget disclosure and progress reporting give residents evidence they can use to question decisions."],
      ["Social and Economic Development", "Distribution of income", "National income grows, yet many households report little change in their living standards. Which explanation best accounts for both observations?", "Most of the additional income accrues to a small group.", "Every household receives an equal share of the additional income.", "Every household’s real income rises at the same rate.", "Public services improve equally in every district.", "An increase in aggregate income can coexist with little improvement for many households if the gains are concentrated."],
      ["The Environment", "Sustainable development", "A district needs market space, but the proposed site is on a wetland that absorbs seasonal floodwater. Which approach best addresses both needs?", "Build on nearby higher ground and protect the wetland’s drainage function.", "Build on the wetland and direct runoff into low-lying homes.", "Drain the wetland and deepen the market foundations.", "Expand paved parking across the wetland and add warning signs.", "Moving construction to higher ground provides market space while preserving natural flood storage."],
    ],
  },
} as const;

export const wassceOriginalItems: TechBankQuestion[] = Object.entries(subjects).flatMap(([topicId, subject]) =>
  subject.items.map(([strand, subStrand, questionText, answer, b, c, d, explanation], index) => ({
    questionId: `exam-${topicId}-curriculum-v1-${index + 1}`,
    courseSlug: `exam-${topicId}`,
    topicId,
    topicLabel: subject.label,
    questionText,
    options: [answer, b, c, d],
    correctIndex: 0,
    explanation,
    difficulty: "intermediate",
    questionType: "mcq",
    sourceDocument: "Original GigaLearn practice informed by WAEC Ghana exam materials",
    sourceQuestionNumber: index + 1,
    reviewStatus: "pending_review",
      sourceType: "original_practice",
      verificationStatus: "awaiting_verification",
    tags: [strand, subStrand],
    curriculumStrand: strand,
    curriculumSubStrand: subStrand,
  })),
);
