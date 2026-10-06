/**
 * Early Years & Lower Primary teaching methodology registry.
 * Used inside Student, Teacher, Create and AI Tutor — not top-level navigation.
 */
import type { LevelBand } from "@/lib/gigalearn/curriculumEngine";

export type TeachingMethodologyId =
  | "look-and-say"
  | "play-based"
  | "storytelling"
  | "songs-rhymes-music"
  | "drill-repetition"
  | "game-based"
  | "activity-based"
  | "hands-on"
  | "multisensory"
  | "audio-visual-digital"
  | "role-play"
  | "question-and-answer"
  | "practice-progressive"
  | "collaborative"
  | "inquiry-based"
  | "outdoor-nature"
  | "project-based"
  | "culturally-responsive"
  | "differentiated"
  | "student-teacher-parent-progress";

export interface TeachingMethodology {
  id: TeachingMethodologyId;
  name: string;
  shortLabel: string;
  description: string;
  suitableBands: LevelBand[];
  ageRange: string;
  suitableSubjects: string[];
  learningGoals: string[];
  exampleActivities: string[];
  recommendedMaterials: string[];
  assessmentApproach: string;
  progressionGuidance: string;
  culturalGuidance: string;
  /** Prompt section header when this method appears in generated content. */
  activitySectionLabel: string;
}

export const TEACHING_METHODOLOGIES: TeachingMethodology[] = [
  {
    id: "look-and-say",
    name: "Look-and-Say / Concrete Learning",
    shortLabel: "Look & Say",
    description: "Learners see real objects or pictures, hear the name, and repeat aloud.",
    suitableBands: ["early-years", "primary"],
    ageRange: "3–8",
    suitableSubjects: ["mathematics", "english", "environmental", "general"],
    learningGoals: ["Connect symbols to concrete objects", "Build oral vocabulary", "Support counting and recognition"],
    exampleActivities: ["Show 10 bottle tops and count together", "Point to colours on classroom objects"],
    recommendedMaterials: ["Local counters (bottle tops, pebbles)", "Picture cards", "Everyday classroom objects"],
    assessmentApproach: "Observe oral responses and one-to-one matching of object to number/word.",
    progressionGuidance: "Start with 1–3 objects, then 1–5, then 1–10 with mixed arrangements.",
    culturalGuidance: "Use familiar Ghanaian items: kenkey wraps, plantain, chalk, sandals, local fruits.",
    activitySectionLabel: "SEE & SAY",
  },
  {
    id: "play-based",
    name: "Play-Based Learning",
    shortLabel: "Play",
    description: "Structured play where children explore concepts through games and pretend scenarios.",
    suitableBands: ["early-years", "primary"],
    ageRange: "3–8",
    suitableSubjects: ["mathematics", "english", "creative", "general"],
    learningGoals: ["Motivation through play", "Social interaction", "Concept exploration without pressure"],
    exampleActivities: ["Market-stall role play for counting money", "Sorting shop game by shape and colour"],
    recommendedMaterials: ["Toy money", "Baskets", "Simple rules cards"],
    assessmentApproach: "Teacher observation checklist during play — participation, correct use of vocabulary.",
    progressionGuidance: "Short rounds (5–8 min), increase complexity only after success.",
    culturalGuidance: "Market, trotro, and home-kitchen play contexts feel familiar and inclusive.",
    activitySectionLabel: "PLAY",
  },
  {
    id: "storytelling",
    name: "Storytelling & Story-Based Learning",
    shortLabel: "Story",
    description: "Teach through short stories, Ananse tales, or narrative examples tied to the topic.",
    suitableBands: ["early-years", "primary", "jhs"],
    ageRange: "4–14",
    suitableSubjects: ["english", "social", "environmental", "mathematics", "general"],
    learningGoals: ["Contextual understanding", "Memory through narrative", "Moral and cultural connection"],
    exampleActivities: ["Short story where characters share 10 oranges fairly", "Ananse story introducing a science idea"],
    recommendedMaterials: ["Story cards", "Simple illustrations", "Puppet or voice"],
    assessmentApproach: "Retell key facts from the story; answer 2–3 story-based questions.",
    progressionGuidance: "Shorter stories for KG; add a problem to solve in the story for P4+.",
    culturalGuidance: "Use Ghanaian settings, names, and folktale patterns respectfully — not as stereotypes.",
    activitySectionLabel: "STORY",
  },
  {
    id: "songs-rhymes-music",
    name: "Songs, Rhymes & Music",
    shortLabel: "Song/Rhyme",
    description: "Rhythm, clapping, and call-and-response to anchor facts and sequences.",
    suitableBands: ["early-years", "primary"],
    ageRange: "3–9",
    suitableSubjects: ["mathematics", "english", "general"],
    learningGoals: ["Auditory memory", "Sequence recall", "Joyful repetition"],
    exampleActivities: ["Counting rhyme to 10 with claps", "Days-of-the-week song in English and local language phrase"],
    recommendedMaterials: ["Hand claps", "Simple drum or table tap", "GigaRhymes-style original verses"],
    assessmentApproach: "Learner recites rhyme or completes missing line in call-and-response.",
    progressionGuidance: "One verse first; add motion or second verse after mastery.",
    culturalGuidance: "Blend English classroom language with optional Twi/Ga/Ewe phrase where teacher chooses.",
    activitySectionLabel: "SING",
  },
  {
    id: "drill-repetition",
    name: "Drill & Repetition",
    shortLabel: "Drill",
    description: "Brief, focused repetition of facts, sounds, or steps — never long rote blocks for KG.",
    suitableBands: ["early-years", "primary", "jhs"],
    ageRange: "5–15",
    suitableSubjects: ["mathematics", "english", "general"],
    learningGoals: ["Automatic recall", "Fluency", "Confidence"],
    exampleActivities: ["60-second number chain", "Phonics repetition with flash cards"],
    recommendedMaterials: ["Flash cards", "Timer", "Choral response"],
    assessmentApproach: "Timed oral drill or 5-item written sprint.",
    progressionGuidance: "Keep KG drills under 2 minutes; increase item count gradually.",
    culturalGuidance: "Use local number contexts (cedi coins, fingers) not abstract-only drills for young learners.",
    activitySectionLabel: "DRILL",
  },
  {
    id: "game-based",
    name: "Game-Based Learning",
    shortLabel: "Game",
    description: "Rules-light games with clear win conditions tied to the learning objective.",
    suitableBands: ["early-years", "primary", "jhs"],
    ageRange: "4–14",
    suitableSubjects: ["mathematics", "english", "science", "general"],
    learningGoals: ["Engagement", "Quick decision making", "Friendly competition"],
    exampleActivities: ["Number bingo with bottle tops", "Team quiz race on the board"],
    recommendedMaterials: ["Counters", "Board", "Simple score chart"],
    assessmentApproach: "Track correct answers during game rounds; debrief mistakes.",
    progressionGuidance: "Cooperative games before competitive games in KG.",
    culturalGuidance: "Team names and scenarios from school, home, and community life in Ghana.",
    activitySectionLabel: "GAME",
  },
  {
    id: "activity-based",
    name: "Activity-Based Learning",
    shortLabel: "Activity",
    description: "Short structured tasks the learner completes step by step.",
    suitableBands: ["early-years", "primary", "jhs"],
    ageRange: "4–14",
    suitableSubjects: ["mathematics", "english", "science", "creative", "general"],
    learningGoals: ["Active participation", "Step following", "Independent try"],
    exampleActivities: ["Cut-and-sort shapes", "Label a diagram of the classroom"],
    recommendedMaterials: ["Paper", "Crayons", "Scissors (supervised)", "Worksheet"],
    assessmentApproach: "Check completed activity against a simple rubric.",
    progressionGuidance: "One activity block at a time for KG; combine two for P3+.",
    culturalGuidance: "Activities use materials common in Ghanaian classrooms.",
    activitySectionLabel: "DO",
  },
  {
    id: "hands-on",
    name: "Hands-On / Experiential Learning",
    shortLabel: "Hands-On",
    description: "Physical manipulation of materials to discover or confirm a concept.",
    suitableBands: ["early-years", "primary", "jhs"],
    ageRange: "4–14",
    suitableSubjects: ["mathematics", "science", "creative", "general"],
    learningGoals: ["Concrete understanding", "Motor coordination", "Discovery"],
    exampleActivities: ["Group 10 objects into twos", "Measure water with cups"],
    recommendedMaterials: ["Containers", "Sand/water (supervised)", "Local manipulatives"],
    assessmentApproach: "Observe manipulation and oral explanation of what they did.",
    progressionGuidance: "Teacher models first; learner copies; then learner invents arrangement.",
    culturalGuidance: "Cooking, farming, and market measuring contexts when relevant.",
    activitySectionLabel: "HANDS-ON",
  },
  {
    id: "multisensory",
    name: "Multisensory Learning",
    shortLabel: "Multisensory",
    description: "Combine sight, sound, touch, and movement in one short learning moment.",
    suitableBands: ["early-years", "primary"],
    ageRange: "3–9",
    suitableSubjects: ["mathematics", "english", "general"],
    learningGoals: ["Multiple pathways to memory", "Inclusive access", "Engagement"],
    exampleActivities: ["Trace number in sand while saying it", "Jump on number line on the floor"],
    recommendedMaterials: ["Sand tray", "Floor tape", "Texture cards"],
    assessmentApproach: "Can learner demonstrate via two senses (say + show)?",
    progressionGuidance: "One sensory pair per activity for KG; add third sense in P2+.",
    culturalGuidance: "Outdoor and classroom-safe materials available locally.",
    activitySectionLabel: "SENSES",
  },
  {
    id: "audio-visual-digital",
    name: "Audio-Visual & Digital Learning",
    shortLabel: "Audio-Visual",
    description: "Pictures, short video descriptions, or read-aloud with visual support.",
    suitableBands: ["early-years", "primary", "jhs", "shs"],
    ageRange: "4–18",
    suitableSubjects: ["general", "science", "english", "mathematics"],
    learningGoals: ["Visual anchoring", "Accessible explanation", "Dual coding"],
    exampleActivities: ["Describe a diagram of counting objects", "Picture sequence for a process"],
    recommendedMaterials: ["Projector or phone", "Printed visuals", "Giga3 read-aloud"],
    assessmentApproach: "Questions about the visual; label parts of a diagram.",
    progressionGuidance: "One image + one question for KG; short slideshow for upper primary.",
    culturalGuidance: "Images reflect Ghanaian people and settings authentically.",
    activitySectionLabel: "WATCH & LISTEN",
  },
  {
    id: "role-play",
    name: "Role-Play & Dramatic Play",
    shortLabel: "Role-Play",
    description: "Act out scenarios to practise language, social skills, or procedures.",
    suitableBands: ["early-years", "primary", "jhs"],
    ageRange: "4–14",
    suitableSubjects: ["english", "social", "general"],
    learningGoals: ["Communication", "Perspective taking", "Procedure recall"],
    exampleActivities: ["Shopkeeper and customer counting change", "Doctor visit hygiene drama"],
    recommendedMaterials: ["Simple costumes", "Props", "Role cards"],
    assessmentApproach: "Rubric for clarity, correctness of facts used in dialogue.",
    progressionGuidance: "Teacher-led drama in KG; small-group scripts in upper primary.",
    culturalGuidance: "Roles reflect community helpers children know.",
    activitySectionLabel: "ACT",
  },
  {
    id: "question-and-answer",
    name: "Question-and-Answer Learning",
    shortLabel: "Q&A",
    description: "Short oral or written questions with wait time and scaffolding.",
    suitableBands: ["primary", "jhs", "shs"],
    ageRange: "6–18",
    suitableSubjects: ["general", "mathematics", "english", "science"],
    learningGoals: ["Check understanding", "Think before answering", "Correct misconceptions"],
    exampleActivities: ["Thumbs up/down quick check", "Partner ask-and-answer"],
    recommendedMaterials: ["Question cards", "Mini whiteboards"],
    assessmentApproach: "Track correct oral/written responses; note common errors.",
    progressionGuidance: "Closed questions first for young learners; open questions for JHS+.",
    culturalGuidance: "Questions use familiar contexts before abstract ones.",
    activitySectionLabel: "ASK & ANSWER",
  },
  {
    id: "practice-progressive",
    name: "Practice & Progressive Learning",
    shortLabel: "Practice",
    description: "Graduated exercises from easy to harder with success feedback.",
    suitableBands: ["early-years", "primary", "jhs", "shs"],
    ageRange: "4–18",
    suitableSubjects: ["mathematics", "english", "general"],
    learningGoals: ["Mastery through steps", "Confidence building", "Spacing difficulty"],
    exampleActivities: ["Count 1–3, then 1–5, then 1–10", "Three MCQs then two short answers"],
    recommendedMaterials: ["Worksheet levels", "Digital practice if available"],
    assessmentApproach: "Score per level; advance only after threshold (e.g. 70%).",
    progressionGuidance: "Never skip levels for KG; celebrate small wins.",
    culturalGuidance: "Word problems use local names and settings naturally.",
    activitySectionLabel: "PRACTISE",
  },
  {
    id: "collaborative",
    name: "Collaborative Learning",
    shortLabel: "Together",
    description: "Pairs or small groups share thinking and build a joint answer.",
    suitableBands: ["primary", "jhs", "shs"],
    ageRange: "7–18",
    suitableSubjects: ["general", "mathematics", "english", "science"],
    learningGoals: ["Peer explanation", "Teamwork", "Multiple strategies"],
    exampleActivities: ["Think-pair-share on a word problem", "Group poster on a topic"],
    recommendedMaterials: ["Chart paper", "Group roles card"],
    assessmentApproach: "Group product plus individual exit ticket.",
    progressionGuidance: "Pairs in P1–P3; groups of 3–4 in JHS+.",
    culturalGuidance: "Encourage respectful turn-taking aligned with classroom norms.",
    activitySectionLabel: "TOGETHER",
  },
  {
    id: "inquiry-based",
    name: "Inquiry-Based Learning",
    shortLabel: "Inquiry",
    description: "Learner asks questions, investigates, and draws conclusions with guidance.",
    suitableBands: ["primary", "jhs", "shs"],
    ageRange: "8–18",
    suitableSubjects: ["science", "social", "mathematics", "general"],
    learningGoals: ["Curiosity", "Evidence use", "Reasoning"],
    exampleActivities: ["Why do shadows change? observe and record", "Investigate which shape rolls"],
    recommendedMaterials: ["Notebook", "Simple measuring tools"],
    assessmentApproach: "Evaluate question quality, evidence cited, and conclusion.",
    progressionGuidance: "Teacher sets question for P4–P6; learner proposes question in JHS+.",
    culturalGuidance: "Inquiries can start from local environment (weather, market, farm).",
    activitySectionLabel: "INVESTIGATE",
  },
  {
    id: "outdoor-nature",
    name: "Outdoor & Nature-Based Learning",
    shortLabel: "Outdoor",
    description: "Use the school yard, plants, or weather as the lesson context.",
    suitableBands: ["early-years", "primary", "jhs"],
    ageRange: "4–14",
    suitableSubjects: ["environmental", "science", "mathematics", "general"],
    learningGoals: ["Real-world connection", "Observation skills", "Health and movement"],
    exampleActivities: ["Count trees in a row", "Collect leaves by shape"],
    recommendedMaterials: ["Clipboard", "Bags for collection", "Sun safety reminder"],
    assessmentApproach: "Observation journal or oral report of findings.",
    progressionGuidance: "Short outdoor slot (10 min) for KG; structured field notes for upper primary.",
    culturalGuidance: "Respect local plants, privacy, and safety; no unsafe foraging.",
    activitySectionLabel: "OUTSIDE",
  },
  {
    id: "project-based",
    name: "Project-Based Learning",
    shortLabel: "Project",
    description: "Multi-step project producing a visible outcome over more than one lesson.",
    suitableBands: ["primary", "jhs", "shs"],
    ageRange: "9–18",
    suitableSubjects: ["general", "creative", "science", "social"],
    learningGoals: ["Planning", "Sustained effort", "Presentation"],
    exampleActivities: ["Class number chart display", "Mini garden measurement project"],
    recommendedMaterials: ["Project checklist", "Display board"],
    assessmentApproach: "Rubric: plan, execution, presentation, reflection.",
    progressionGuidance: "Mini-projects (1 day) in P4–P6; week-long in JHS+.",
    culturalGuidance: "Projects can serve class or community where appropriate.",
    activitySectionLabel: "PROJECT",
  },
  {
    id: "culturally-responsive",
    name: "Culturally Responsive Learning",
    shortLabel: "Culture",
    description: "Examples, names, and contexts reflect Ghanaian and African learners' lives.",
    suitableBands: ["early-years", "primary", "jhs", "shs"],
    ageRange: "3–18",
    suitableSubjects: ["general", "english", "social", "mathematics", "science"],
    learningGoals: ["Relevance", "Identity affirmation", "Deeper engagement"],
    exampleActivities: ["Word problem at Makola market", "Story set in a Ghanaian home"],
    recommendedMaterials: ["Local photo cards", "Community guest (if available)"],
    assessmentApproach: "Same academic criteria — context is wrapper, not lower standard.",
    progressionGuidance: "Embed culture in every method, not only this block.",
    culturalGuidance: "Avoid stereotypes; use diverse Ghanaian names and settings authentically.",
    activitySectionLabel: "OUR CONTEXT",
  },
  {
    id: "differentiated",
    name: "Individualized / Differentiated Learning",
    shortLabel: "Differentiate",
    description: "Adjust pace, support, and challenge for different learners in one lesson.",
    suitableBands: ["early-years", "primary", "jhs", "shs"],
    ageRange: "3–18",
    suitableSubjects: ["general"],
    learningGoals: ["Include all learners", "Extension and support paths", "Reduce frustration"],
    exampleActivities: ["Same topic: counters for some, number line for others", "Optional challenge question"],
    recommendedMaterials: ["Tiered worksheets", "Helper cards"],
    assessmentApproach: "Track individual exit level, not only class average.",
    progressionGuidance: "Must-have core task plus optional stretch for KG–Primary.",
    culturalGuidance: "Differentiation respects mixed ability common in large classes.",
    activitySectionLabel: "FOR EVERY LEARNER",
  },
  {
    id: "student-teacher-parent-progress",
    name: "Student–Teacher–Parent–Progress",
    shortLabel: "Progress Loop",
    description: "Connect learning activity to feedback loops involving teacher and parent where possible.",
    suitableBands: ["early-years", "primary", "jhs"],
    ageRange: "3–15",
    suitableSubjects: ["general"],
    learningGoals: ["Shared understanding of progress", "Home practice alignment", "Celebration"],
    exampleActivities: ["Take-home 5-minute practice card", "Parent tip: count objects at home"],
    recommendedMaterials: ["Progress sticker chart", "Parent summary note"],
    assessmentApproach: "Record milestone; share plain-language summary for home.",
    progressionGuidance: "Simple parent note for KG; learner self-reflection added in P4+.",
    culturalGuidance: "Parent tips respect busy home schedules and low-resource settings.",
    activitySectionLabel: "PROGRESS",
  },
];

// Fix typo in songs-rhymes entry - I had assessmentApproance duplicate. Let me fix when writing - I already have duplicate key issue.

export function getMethodology(id: string): TeachingMethodology | undefined {
  return TEACHING_METHODOLOGIES.find((m) => m.id === id);
}

export function methodologiesForBand(band: LevelBand | undefined): TeachingMethodology[] {
  if (!band) return TEACHING_METHODOLOGIES;
  return TEACHING_METHODOLOGIES.filter((m) => m.suitableBands.includes(band));
}

/** Auto-select 3–6 methods appropriate to grade, subject and topic. */
export function selectMethodologiesForContext(args: {
  levelBand?: LevelBand;
  subjectId?: string;
  topic?: string;
  explicitIds?: string[];
  max?: number;
}): TeachingMethodology[] {
  if (args.explicitIds?.length) {
    return args.explicitIds
      .map((id) => getMethodology(id))
      .filter((m): m is TeachingMethodology => Boolean(m))
      .slice(0, args.max ?? 6);
  }

  const band = args.levelBand ?? "primary";
  const subject = (args.subjectId ?? "general").toLowerCase();
  const topic = (args.topic ?? "").toLowerCase();
  const pool = methodologiesForBand(band);

  const scored = pool.map((m) => {
    let score = m.suitableBands.includes(band) ? 2 : 0;
    if (m.suitableSubjects.some((s) => subject.includes(s) || s === "general")) score += 1;
    if (band === "early-years") {
      if (["look-and-say", "play-based", "songs-rhymes-music", "hands-on", "game-based"].includes(m.id)) score += 2;
      if (["project-based", "inquiry-based"].includes(m.id)) score -= 1;
    }
    if (topic.includes("count") && ["look-and-say", "drill-repetition", "songs-rhymes-music", "hands-on"].includes(m.id)) {
      score += 2;
    }
    if (topic.includes("story") && m.id === "storytelling") score += 3;
    return { m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const picked: TeachingMethodology[] = [];
  for (const { m } of scored) {
    if (picked.length >= (args.max ?? 6)) break;
    if (!picked.some((p) => p.id === m.id)) picked.push(m);
  }
  return picked.length ? picked : pool.slice(0, 4);
}

export function isEarlyYearsBand(band: LevelBand | undefined): boolean {
  return band === "early-years" || band === "primary";
}

/** Server-safe prompt block — imported by Convex actions. */
export function buildMethodologyPromptBlock(methods: TeachingMethodology[], args: {
  levelBand?: LevelBand;
  gradeLabel?: string;
}): string {
  if (!methods.length) return "";

  const earlyYears = isEarlyYearsBand(args.levelBand);
  const lines: string[] = [
    "TEACHING METHODOLOGY (must shape the generated lesson — not labels only):",
    earlyYears
      ? "Early Years / Lower Primary rules: short instructions, simple language, concrete objects, movement, games, rhymes, positive feedback, progressive difficulty. Avoid long text-heavy sections."
      : "Adapt methods to the stated grade — simpler and concrete for lower grades.",
    "",
    "Structure the learner-facing activities using these section headers where appropriate:",
  ];

  for (const m of methods) {
    lines.push(
      `### ${m.activitySectionLabel} — ${m.name}`,
      `Use because: ${m.description}`,
      `Example: ${m.exampleActivities[0] ?? "Age-appropriate activity"}`,
      `Materials: ${m.recommendedMaterials.slice(0, 3).join(", ")}`,
      `Culture: ${m.culturalGuidance}`,
      ""
    );
  }

  lines.push(
    "Do NOT force every method into one lesson — use only what fits the topic.",
    "For counting and number topics, combine SEE (concrete objects), SAY (oral count), SING (rhyme if suitable), PLAY (game), DO (hands-on grouping), PRACTISE (progressive exercises), ASK & ANSWER (simple checks), PROGRESS (note milestone for teacher/parent).",
    "Use familiar Ghanaian objects and settings naturally — no stereotypes, no invented official standards."
  );

  return lines.join("\n");
}
