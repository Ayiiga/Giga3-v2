export type PracticeModeId =
  | "quick"
  | "rapid-fire"
  | "mission"
  | "revision"
  | "exam";

export type PracticeModeConfig = {
  id: PracticeModeId;
  label: string;
  description: string;
  /** Seconds per question in timed modes; 0 = no timer */
  secondsPerQuestion: number;
  /** Hide explanations until session ends (exam realism) */
  delayFeedback: boolean;
  /** Show streak bonus messaging */
  showStreak: boolean;
};

export const PRACTICE_MODES: PracticeModeConfig[] = [
  {
    id: "quick",
    label: "Quick poll",
    description: "One question at a time with instant feedback.",
    secondsPerQuestion: 0,
    delayFeedback: false,
    showStreak: false,
  },
  {
    id: "rapid-fire",
    label: "Rapid fire",
    description: "Short timed questions — answer quickly!",
    secondsPerQuestion: 45,
    delayFeedback: false,
    showStreak: true,
  },
  {
    id: "mission",
    label: "Mission mode",
    description: "Complete a sequence of related challenges.",
    secondsPerQuestion: 0,
    delayFeedback: false,
    showStreak: true,
  },
  {
    id: "revision",
    label: "Revision",
    description: "Practice at your pace with explanations.",
    secondsPerQuestion: 0,
    delayFeedback: false,
    showStreak: false,
  },
  {
    id: "exam",
    label: "Exam practice",
    description: "Timed exam-style — explanations after submission.",
    secondsPerQuestion: 90,
    delayFeedback: true,
    showStreak: false,
  },
];

export function getPracticeMode(id: PracticeModeId): PracticeModeConfig {
  return PRACTICE_MODES.find((m) => m.id === id) ?? PRACTICE_MODES[0];
}
